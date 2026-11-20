<?php

namespace App\Http\Controllers;

use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        return ApiResponse::success($request->user()->categories()->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('categories')->where('user_id', $request->user()->id)],
        ]);

        return ApiResponse::success($request->user()->categories()->create($data), 201);
    }
}
