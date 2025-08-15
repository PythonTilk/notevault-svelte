<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth';
  import { Eye, EyeOff, Mail, Lock, User } from 'lucide-svelte';
  import { toastStore } from '$lib/stores/toast';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  let username = '';
  let email = '';
  let displayName = '';
  let password = '';
  let confirmPassword = '';
  let showPassword = false;
  let showConfirmPassword = false;
  let isLoading = false;
  let error = '';

  async function handleRegister() {
    if (!username || !email || !displayName || !password || !confirmPassword) {
      toastStore.warning('Missing Information', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toastStore.error('Password Mismatch', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toastStore.error('Weak Password', 'Password must be at least 6 characters long');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toastStore.error('Invalid Email', 'Please enter a valid email address');
      return;
    }

    isLoading = true;

    try {
      const result = await authStore.register({
        username,
        email,
        displayName,
        password
      });
      
      if (result.success) {
        toastStore.success('Account Created!', 'Welcome to NoteVault! You have been logged in.');
        goto('/');
      } else {
        toastStore.error('Registration Failed', result.error || 'Unable to create account');
      }
    } catch (err) {
      toastStore.error('Registration Error', 'Unable to connect to server. Please try again.');
      console.error('Registration error:', err);
    } finally {
      isLoading = false;
    }
  }

  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }

  function toggleConfirmPasswordVisibility() {
    showConfirmPassword = !showConfirmPassword;
  }
</script>

<svelte:head>
  <title>Sign Up - NoteVault</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Logo and Header -->
    <div class="text-center">
      <div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
        <span class="text-white font-bold text-xl">NV</span>
      </div>
      <h2 class="text-3xl font-bold text-white">Create your account</h2>
      <p class="mt-2 text-dark-400">Join NoteVault and start organizing your ideas</p>
    </div>

    <!-- Registration Form -->
    <form class="mt-8 space-y-6" on:submit|preventDefault={handleRegister}>

      <div class="space-y-4">
        <!-- Username -->
        <div>
          <label for="username" class="block text-sm font-medium text-dark-300 mb-2">
            Username
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User class="h-5 w-5 text-dark-400" />
            </div>
            <input
              id="username"
              type="text"
              bind:value={username}
              class="input pl-10"
              placeholder="Enter your username"
              required
            />
          </div>
        </div>

        <!-- Display Name -->
        <div>
          <label for="displayName" class="block text-sm font-medium text-dark-300 mb-2">
            Display Name
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User class="h-5 w-5 text-dark-400" />
            </div>
            <input
              id="displayName"
              type="text"
              bind:value={displayName}
              class="input pl-10"
              placeholder="Enter your display name"
              required
            />
          </div>
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-dark-300 mb-2">
            Email address
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail class="h-5 w-5 text-dark-400" />
            </div>
            <input
              id="email"
              type="email"
              bind:value={email}
              class="input pl-10"
              placeholder="Enter your email"
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

        <!-- Confirm Password -->
        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-dark-300 mb-2">
            Confirm Password
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock class="h-5 w-5 text-dark-400" />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              bind:value={confirmPassword}
              class="input pl-10 pr-10"
              placeholder="Confirm your password"
              required
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center"
              on:click={toggleConfirmPasswordVisibility}
            >
              {#if showConfirmPassword}
                <EyeOff class="h-5 w-5 text-dark-400 hover:text-dark-300" />
              {:else}
                <Eye class="h-5 w-5 text-dark-400 hover:text-dark-300" />
              {/if}
            </button>
          </div>
        </div>
      </div>

      <!-- Terms and Privacy -->
      <div class="flex items-center">
        <input
          id="terms"
          type="checkbox"
          class="h-4 w-4 rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500"
          required
        />
        <label for="terms" class="ml-2 block text-sm text-dark-300">
          I agree to the <a href="/terms" class="text-primary-400 hover:text-primary-300">Terms of Service</a> and 
          <a href="/privacy" class="text-primary-400 hover:text-primary-300">Privacy Policy</a>
        </label>
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
              <LoadingSpinner size="sm" color="white" />
              <span class="ml-2">Creating account...</span>
            </div>
          {:else}
            Create account
          {/if}
        </button>
      </div>

      <!-- Sign in link -->
      <div class="text-center">
        <p class="text-dark-400">
          Already have an account?
          <a href="/login" class="text-primary-400 hover:text-primary-300 font-medium">
            Sign in
        </a>
        </p>
      </div>
    </form>
  </div>
</div>