<?php

namespace App\Http\Controllers;

use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('user_id', $request->user()->id)],
        ]);

        $query = $request->user()->transactions()->with(['account', 'category']);
        if (! empty($filters['from'])) {
            $query->whereDate('date', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->whereDate('date', '<=', $filters['to']);
        }
        if (! empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        return ApiResponse::success($query->orderByDesc('date')->orderByDesc('id')->get());
    }

    public function store(Request $request)
    {
        $transaction = $request->user()->transactions()->create($this->validateTransaction($request));

        return ApiResponse::success($transaction->load(['account', 'category']), 201);
    }

    public function show(Request $request, int $id)
    {
        return ApiResponse::success($request->user()->transactions()->with(['account', 'category'])->findOrFail($id));
    }

    public function update(Request $request, int $id)
    {
        $transaction = $request->user()->transactions()->findOrFail($id);
        $transaction->update($this->validateTransaction($request));

        return ApiResponse::success($transaction->load(['account', 'category']));
    }

    public function destroy(Request $request, int $id)
    {
        $request->user()->transactions()->findOrFail($id)->delete();

        return ApiResponse::success(['message' => 'Transaction deleted.']);
    }

    private function validateTransaction(Request $request): array
    {
        return $request->validate([
            'account_id' => ['required', 'integer', Rule::exists('accounts', 'id')->where('user_id', $request->user()->id)],
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('user_id', $request->user()->id)],
            'type' => ['required', Rule::in(['income', 'expense'])],
            'amount_cents' => ['required', 'integer', 'between:1,2000000000'],
            'date' => ['required', 'date_format:Y-m-d'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);
    }
}
