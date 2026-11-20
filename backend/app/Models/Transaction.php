<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = ['account_id', 'category_id', 'type', 'amount_cents', 'date', 'description'];

    protected function casts(): array
    {
        return ['amount_cents' => 'integer'];
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
