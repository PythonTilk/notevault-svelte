<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth';
  import { Eye, EyeOff, Mail, Lock } from 'lucide-svelte';
  import { toastStore } from '$lib/stores/toast';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  let identifier = '';
  let password = '';
  let showPassword = false;
  let isLoading = false;
  let error = '';

  async function handleLogin() {
    if (!identifier || !password) {
      toastStore.warning('Missing Information', 'Please fill in all fields');
      return;
    }

    isLoading = true;

    try {
      const result = await authStore.login(identifier, password);
      if (result.success) {
        toastStore.success('Welcome back!', 'Successfully logged in');
        goto('/');
      } else {
        toastStore.error('Login Failed', result.error || 'Invalid email or password');
      }
    } catch (err) {
      toastStore.error('Login Error', 'Unable to connect to server. Please try again.');
      console.error('Login error:', err);
    } finally {
      isLoading = false;
    }
  }

  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }
</script>

<svelte:head>
  <title>Sign In - NoteVault</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Logo and Header -->
    <div class="text-center">
      <div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
        <span class="text-white font-bold text-xl">NV</span>
      </div>
      <h2 class="text-3xl font-bold text-white">Welcome back</h2>
      <p class="mt-2 text-dark-400">Sign in to your NoteVault account</p>
    </div>

    <!-- Login Form -->
    <form class="mt-8 space-y-6" on:submit|preventDefault={handleLogin}>
      {#if error}
        <div class="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <p class="text-red-400 text-sm">{error}</p>
        </div>
      {/if}

      <div class="space-y-4">
        <!-- Email or Username -->
        <div>
          <label for="identifier" class="block text-sm font-medium text-dark-300 mb-2">
            Email or Username
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail class="h-5 w-5 text-dark-400" />
            </div>
            <input
              id="identifier"
              type="text"
              bind:value={identifier}
              class="input pl-10"
              placeholder="Enter your email or username"
              required
            />
          </div>
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="block text-sm font-medium text-dark-300 mb-2">
            Password
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock class="h-5 w-5 text-dark-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              bind:value={password}
              class="input pl-10 pr-10"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center"
              on:click={togglePasswordVisibility}
            >
              {#if showPassword}
                <EyeOff class="h-5 w-5 text-dark-400 hover:text-dark-300" />
              {:else}
                <Eye class="h-5 w-5 text-dark-400 hover:text-dark-300" />
              {/if}
            </button>
          </div>
        </div>
      </div>

      <!-- Remember me and Forgot password -->
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            class="h-4 w-4 rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500"
          />
          <label for="remember-me" class="ml-2 block text-sm text-dark-300">
            Remember me
          </label>
        </div>

        <div class="text-sm">
          <a href="/forgot-password" class="text-primary-400 hover:text-primary-300">
            Forgot your password?
          </a>
        </div>
      </div>

      <!-- Submit Button -->
      <div>
        <button
          type="submit"
          class="w-full btn-primary py-3 text-base font-medium"
          disabled={isLoading}
        >
          {#if isLoading}
            <div class="flex items-center justify-center">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Signing in...
            </div>
          {:else}
            Sign in
          {/if}
        </button>
      </div>

      <!-- Demo Credentials -->
      <div class="bg-blue-500/10 border border-blue-500 rounded-lg p-4">
        <p class="text-blue-400 text-sm font-medium mb-2">Demo Credentials:</p>
        <p class="text-blue-300 text-sm">Username: demo | Password: demo123</p>
        <p class="text-blue-300 text-sm">Username: admin | Password: admin123</p>
        <p class="text-blue-300 text-sm text-xs mt-1 opacity-75">You can also use email addresses</p>
      </div>

      <!-- Sign up link -->
      <div class="text-center">
        <p class="text-dark-400">
          Don't have an account?
          <a href="/register" class="text-primary-400 hover:text-primary-300 font-medium">
            Sign up
          </a>
        </p>
      </div>
    </form>
  </div>
</div>