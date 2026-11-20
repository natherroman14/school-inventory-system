<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '../../components/AuthLayout.vue'
import Icon from '../../components/Icon.vue'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const touched = ref(false)

async function submit() {
  touched.value = true
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = 'Enter both your username and password.'
    return
  }
  try {
    await auth.login(username.value.trim(), password.value)
    ui.notify(`Welcome, ${auth.user?.fullName || 'User'}`)
    router.push(route.query.redirect || auth.homeRoute)
  } catch (err) {
    error.value = err.message || 'Invalid credentials. Please try again.'
  }
}
</script>

<template>
  <AuthLayout>
    <div class="login-card card">
      <div class="login-head">
        <div class="login-icon"><Icon name="lock" :size="22" /></div>
        <h1>Sign in to your account</h1>
        <p>ESSU-Salcedo Campus &middot; Supply Management Portal</p>
      </div>

      <div v-if="error" class="alert alert-error"><Icon name="warning" :size="17" /><span>{{ error }}</span></div>

      <form @submit.prevent="submit">
        <div class="field">
          <label for="username">Username</label>
          <div class="input-icon">
            <Icon name="user" :size="17" />
            <input id="username" v-model="username" class="input" type="text" autocomplete="username" placeholder="Enter your username" :aria-invalid="touched && !username" />
          </div>
          <span v-if="touched && !username" class="field-error">Username is required</span>
        </div>

        <div class="field" style="margin-top: 16px">
          <label for="password">Password</label>
          <div class="input-icon">
            <Icon name="key" :size="17" />
            <input
              id="password"
              v-model="password"
              class="input"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Enter your password"
              :aria-invalid="touched && !password"
            />
            <button type="button" class="toggle-password" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
              <Icon :name="showPassword ? 'eye' : 'eye'" :size="17" />
            </button>
          </div>
          <span v-if="touched && !password" class="field-error">Password is required</span>
        </div>

        <button class="btn btn-primary login-button" type="submit" :disabled="auth.loading">
          <span v-if="auth.loading" class="spinner" />
          <Icon v-else name="logout" :size="17" />
          {{ auth.loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <div class="login-note"><Icon name="info" :size="15" /><span>Accounts are issued by the Property Custodian. Public registration is not available.</span></div>
    </div>
  </AuthLayout>
</template>

<style scoped>
.login-card { padding: 32px; }
.login-head { margin-bottom: 24px; }
.login-icon { display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 16px; border-radius: 12px; background: var(--green-50); color: var(--green-700); }
.login-head h1 { font-size: 1.35rem; letter-spacing: -0.02em; margin-bottom: 5px; }
.login-head p { color: var(--muted); font-size: 0.82rem; margin: 0; }
.input-icon { position: relative; }
.input-icon > svg { position: absolute; left: 12px; top: 11px; color: #8ea096; }
.input-icon .input { padding-left: 38px; padding-right: 42px; }
.toggle-password { position: absolute; right: 8px; top: 6px; width: 28px; height: 28px; display: grid; place-items: center; border: 0; background: transparent; color: var(--muted); border-radius: 6px; }
.toggle-password:hover { background: var(--green-50); color: var(--green-700); }
.login-button { width: 100%; margin-top: 22px; min-height: 43px; }
.login-note { display: flex; gap: 8px; align-items: flex-start; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line); font-size: 0.75rem; color: var(--muted); }
.login-note svg { flex-shrink: 0; margin-top: 1px; }
</style>
