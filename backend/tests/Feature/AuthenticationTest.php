<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receive_a_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Taylor Example',
            'email' => 'taylor@example.com',
            'password' => 'password-123',
            'password_confirmation' => 'password-123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user.email', 'taylor@example.com')
            ->assertJsonStructure(['data' => ['user' => ['id', 'name', 'email'], 'token']]);

        $this->assertDatabaseHas('users', ['email' => 'taylor@example.com']);
        $user = User::where('email', 'taylor@example.com')->firstOrFail();
        $this->assertTrue(Hash::check('password-123', $user->password));
    }

    public function test_registration_requires_matching_password_confirmation(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Taylor Example',
            'email' => 'taylor@example.com',
            'password' => 'password-123',
            'password_confirmation' => 'different-password',
        ]);

        $response->assertUnprocessable()
            ->assertJsonStructure(['message', 'errors' => ['password']]);
    }

    public function test_user_can_log_in_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'taylor@example.com',
            'password' => 'password-123',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'taylor@example.com',
            'password' => 'password-123',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonStructure(['data' => ['user', 'token']]);
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        User::factory()->create(['email' => 'taylor@example.com', 'password' => 'password-123']);

        $response = $this->postJson('/api/login', [
            'email' => 'taylor@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertUnauthorized()
            ->assertJson([
                'message' => 'Invalid email or password.',
                'errors' => [],
            ]);
    }

    public function test_login_is_rate_limited_with_an_api_error(): void
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login', [
                'email' => 'taylor@example.com',
                'password' => 'wrong-password',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/login', [
            'email' => 'taylor@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(429)
            ->assertJsonStructure(['message', 'errors'])
            ->assertHeader('Retry-After');
    }

    public function test_user_can_log_out_and_invalidate_their_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/logout')
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);

        Auth::forgetGuards();

        $this->getJson('/api/user')->assertUnauthorized();
    }
}
