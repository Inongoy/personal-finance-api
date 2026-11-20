<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        $tables = [
            'users', 'password_reset_tokens', 'sessions', 'cache', 'cache_locks',
            'jobs', 'job_batches', 'failed_jobs', 'personal_access_tokens',
            'accounts', 'categories', 'transactions', 'budgets', 'migrations',
        ];

        $roles = ['PUBLIC'];
        foreach (['anon', 'authenticated'] as $role) {
            if (DB::selectOne('SELECT 1 FROM pg_roles WHERE rolname = ?', [$role])) {
                $roles[] = $role;
            }
        }

        foreach ($tables as $table) {
            DB::statement("ALTER TABLE public.\"$table\" ENABLE ROW LEVEL SECURITY");

            foreach ($roles as $role) {
                DB::statement("REVOKE ALL PRIVILEGES ON TABLE public.\"$table\" FROM $role");
            }

            $columns = DB::select(
                'SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?',
                ['public', $table]
            );
            foreach ($columns as $column) {
                $name = str_replace('"', '""', $column->column_name);
                foreach ($roles as $role) {
                    DB::statement("REVOKE ALL PRIVILEGES (\"$name\") ON TABLE public.\"$table\" FROM $role");
                }
            }

            $sequences = DB::select(
                "SELECT s.relname FROM pg_class s
                JOIN pg_namespace n ON n.oid = s.relnamespace
                JOIN pg_depend d ON d.objid = s.oid
                JOIN pg_class t ON t.oid = d.refobjid
                JOIN pg_namespace tn ON tn.oid = t.relnamespace
                WHERE s.relkind = 'S' AND n.nspname = 'public'
                    AND tn.nspname = 'public' AND t.relname = ?",
                [$table]
            );
            foreach ($sequences as $sequence) {
                $name = str_replace('"', '""', $sequence->relname);
                foreach ($roles as $role) {
                    DB::statement("REVOKE ALL PRIVILEGES ON SEQUENCE public.\"$name\" FROM $role");
                }
            }
        }
    }

    public function down(): void
    {
        // Keep access restricted when rolling back migrations.
    }
};
