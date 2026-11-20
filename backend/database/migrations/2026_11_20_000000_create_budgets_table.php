<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->date('month');
            $table->bigInteger('amount_cents');
            $table->timestamps();
            $table->unique(['user_id', 'category_id', 'month']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE budgets ADD CONSTRAINT budgets_amount_positive CHECK (amount_cents > 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
