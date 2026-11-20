<?php

namespace App\Http\Controllers;

use App\Http\Responses\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SummaryController extends Controller
{
    public function show(Request $request)
    {
        $data = $request->validate(['month' => ['required', 'date_format:Y-m']]);
        $start = CarbonImmutable::createFromFormat('!Y-m', $data['month']);
        $query = $request->user()->transactions()->whereBetween('date', [$start->toDateString(), $start->endOfMonth()->toDateString()]);
        $income = (int) (clone $query)->where('type', 'income')->sum('amount_cents');
        $expenses = (int) (clone $query)->where('type', 'expense')->sum('amount_cents');
        $categories = (clone $query)->where('type', 'expense')
            ->leftJoin('categories', 'transactions.category_id', '=', 'categories.id')
            ->select('categories.id', 'categories.name', DB::raw('SUM(transactions.amount_cents) as total_cents'))
            ->groupBy('categories.id', 'categories.name')->get();
        foreach ($categories as $category) {
            $category->total_cents = (int) $category->total_cents;
        }

        return ApiResponse::success([
            'month' => $data['month'],
            'income_cents' => $income,
            'expense_cents' => $expenses,
            'net_cents' => $income - $expenses,
            'categories' => $categories,
        ]);
    }
}
