<?php

namespace App\Http\Controllers;

use App\Http\Responses\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BudgetController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate(['month' => ['required', 'date_format:Y-m']]);
        $start = CarbonImmutable::createFromFormat('!Y-m', $data['month']);
        $budgets = $request->user()->budgets()->with('category')->where('month', $start->toDateString())->get();

        foreach ($budgets as $budget) {
            $budget->spent_cents = (int) $request->user()->transactions()
                ->where('category_id', $budget->category_id)
                ->where('type', 'expense')
                ->whereBetween('date', [$start->toDateString(), $start->endOfMonth()->toDateString()])
                ->sum('amount_cents');
        }

        return ApiResponse::success($budgets);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'category_id' => ['required', 'integer', Rule::exists('categories', 'id')->where('user_id', $request->user()->id)],
            'month' => ['required', 'date_format:Y-m'],
            'amount_cents' => ['required', 'integer', 'between:1,2000000000'],
        ]);
        $month = CarbonImmutable::createFromFormat('!Y-m', $data['month'])->toDateString();
        $budget = $request->user()->budgets()->updateOrCreate(
            ['category_id' => $data['category_id'], 'month' => $month],
            ['amount_cents' => $data['amount_cents']]
        );

        return ApiResponse::success($budget->load('category'), $budget->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, int $id)
    {
        $request->user()->budgets()->findOrFail($id)->delete();

        return ApiResponse::success(['message' => 'Budget deleted.']);
    }
}
