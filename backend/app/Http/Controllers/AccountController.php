<?php

namespace App\Http\Controllers;

use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountController extends Controller
{
    public function index(Request $request)
    {
        $accounts = $request->user()->accounts()->orderBy('name')->get();
        foreach ($accounts as $account) {
            $income = (int) $account->transactions()->where('type', 'income')->sum('amount_cents');
            $expenses = (int) $account->transactions()->where('type', 'expense')->sum('amount_cents');
            $account->balance_cents = (int) $account->starting_balance_cents + $income - $expenses;
        }

        return ApiResponse::success($accounts);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['checking', 'savings', 'credit_card', 'cash'])],
            'starting_balance_cents' => ['required', 'integer', 'between:-2000000000,2000000000'],
        ]);

        return ApiResponse::success($request->user()->accounts()->create($data), 201);
    }

    public function show(Request $request, int $id)
    {
        $account = $request->user()->accounts()->findOrFail($id);
        $income = (int) $account->transactions()->where('type', 'income')->sum('amount_cents');
        $expenses = (int) $account->transactions()->where('type', 'expense')->sum('amount_cents');
        $account->balance_cents = (int) $account->starting_balance_cents + $income - $expenses;

        return ApiResponse::success($account);
    }
}
