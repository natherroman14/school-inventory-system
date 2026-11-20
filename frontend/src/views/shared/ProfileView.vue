<script setup>
import { reactive, ref } from 'vue'
import Icon from '../../components/Icon.vue'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'
import { authService } from '../../services'
import { ROLE_LABELS, SYSTEM_NAME } from '../../utils/constants'
import { formatDate, initials } from '../../utils/format'

const auth = useAuthStore()
const ui = useUiStore()
const saving = ref(false)
const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

async function submit() {
  if (!form.currentPassword || !form.newPassword) {
    ui.notify('Fill in both password fields', 'error')
    return
  }
  if (form.newPassword.length < 8 || !/\d/.test(form.newPassword) || !/[A-Za-z]/.test(form.newPassword)) {
    ui.notify('New password must be at least 8 characters with a letter and a number', 'error')
    return
  }
  if (form.newPassword !== form.confirmPassword) {
    ui.notify('New passwords do not match', 'error')
    return
  }
  saving.value = true
  try {
    await authService.changePassword(form.currentPassword, form.newPassword)
    ui.notify('Password updated successfully')
    Object.assign(form, { currentPassword: '', newPassword: '', confirmPassword: '' })
  } catch (error) {
    ui.notify(error.message, 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="grid grid-2">
    <div class="card">
      <div class="card-header"><h2>Account information</h2><Icon name="user" :size="18" /></div>
      <div class="card-body">
        <div class="row" style="margin-bottom: 20px">
          <div class="large-avatar">{{ initials(auth.user?.fullName) }}</div>
          <div>
            <strong style="font-size: 1.05rem">{{ auth.user?.fullName }}</strong>
            <div class="muted small">@{{ auth.user?.username }}</div>
          </div>
        </div>
        <div class="detail-list">
          <div class="detail-item"><span>Username</span><strong>{{ auth.user?.username }}</strong></div>
          <div class="detail-item"><span>Role</span><strong>{{ ROLE_LABELS[auth.user?.role] }}</strong></div>
          <div class="detail-item"><span>Department / College</span><strong>{{ auth.user?.department }}</strong></div>
          <div class="detail-item"><span>Access Level</span><strong>{{ auth.isAdmin ? 'Administrative' : 'Requisitioner' }}</strong></div>
        </div>
        <div class="divider" />
        <p class="muted small" style="margin: 0">{{ SYSTEM_NAME }}</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h2>Change password</h2><Icon name="lock" :size="18" /></div>
      <form class="card-body" @submit.prevent="submit">
        <p class="muted small">Use at least 8 characters, including a letter and a number.</p>
        <div class="field"><label for="current">Current password</label><input id="current" v-model="form.currentPassword" class="input" type="password" autocomplete="current-password" /></div>
        <div class="field" style="margin-top: 14px"><label for="new">New password</label><input id="new" v-model="form.newPassword" class="input" type="password" autocomplete="new-password" /></div>
        <div class="field" style="margin-top: 14px"><label for="confirm">Confirm new password</label><input id="confirm" v-model="form.confirmPassword" class="input" type="password" autocomplete="new-password" /></div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit" :disabled="saving">
            <span v-if="saving" class="spinner" />
            <Icon v-else name="key" :size="16" />
            {{ saving ? 'Updating…' : 'Update password' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.large-avatar { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 14px; background: var(--green-700); color: #fff; font-size: 1.1rem; font-weight: 800; }
</style>
