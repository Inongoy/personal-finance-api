<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    protected $fillable = ['name', 'type', 'starting_balance_cents'];

    protected function casts(): array
    {
        return ['starting_balance_cents' => 'integer'];
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}
