<script setup>
import { onMounted, ref } from 'vue'
import DataTable from '../../components/DataTable.vue'
import Pagination from '../../components/Pagination.vue'
import Modal from '../../components/Modal.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import Icon from '../../components/Icon.vue'
import { userService } from '../../services'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'
import { ROLES } from '../../utils/constants'
import { formatDate, humanize } from '../../utils/format'

const ui = useUiStore()
const auth = useAuthStore()
const rows = ref([])
const pagination = ref({ total: 0, page: 1, limit: 25, pages: 1 })
const loading = ref(true)
const error = ref('')
const departments = ref([])
const filters = ref({ search: '', role: '', status: '' })

const formModal = ref(false)
const editingId = ref(null)
const form = ref({ fullName: '', username: '', password: '', role: '', department: '' })
const formError = ref('')
const saving = ref(false)

const passwordModal = ref(false)
const passwordTarget = ref(null)
const newPassword = ref('')
const passwordError = ref('')
const busy = ref(false)

const columns = [
  { key: 'fullName', label: 'Name' },
  { key: 'username', label: 'Username' },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department' },
  { key: 'isActive', label: 'Status' },
  { key: 'createdAt', label: 'Created' },
  { key: 'actions', label: 'Actions', class: 'text-right' },
]

function showError(err, target = error) {
  target.value = err.message || 'Unable to complete the request'
  ui.notify(target.value, 'error')
}

function roleLabel(value) {
  return ROLES.find((role) => role.value === value)?.label || (value ? humanize(value) : '—')
}

function isStrong(value) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)
}

function toOptions(payload) {
  const source = payload?.data || payload || {}
  const list = Array.isArray(source) ? source : (source.departments || [])
  return list.map((entry) => {
    if (typeof entry === 'string') return entry
    return entry.department ?? entry.name ?? entry.value ?? ''
  }).filter(Boolean)
}

async function loadDepartments() {
  try {
    const response = await userService.departments()
    departments.value = toOptions(response)
  } catch (err) {
    showError(err)
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await userService.list({ ...filters.value, page: pagination.value.page, limit: pagination.value.limit })
    rows.value = response.data || []
    if (response.pagination) pagination.value = response.pagination
  } catch (err) {
    rows.value = []
    showError(err)
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pagination.value.page = 1
  load()
}

function resetFilters() {
  filters.value = { search: '', role: '', status: '' }
  applyFilters()
}

function goToPage(page) {
  pagination.value.page = page
  load()
}

function openCreate() {
  editingId.value = null
  form.value = { fullName: '', username: '', password: '', role: '', department: departments.value[0] || '' }
  formError.value = ''
  formModal.value = true
}

function openEdit(row) {
  editingId.value = row._id
  form.value = {
    fullName: row.fullName || '',
    username: row.username || '',
    password: '',
    role: row.role || '',
    department: row.department || '',
  }
  formError.value = ''
  formModal.value = true
}

async function saveForm() {
  if (saving.value) return
  const values = form.value
  if (!values.fullName.trim() || !values.username.trim() || !values.role || !values.department) {
    formError.value = 'Name, username, role, and department are required.'
    ui.notify(formError.value, 'error')
    return
  }
  if (!editingId.value && !isStrong(values.password)) {
    formError.value = 'Password must be at least 8 characters with a letter and a number.'
    ui.notify(formError.value, 'error')
    return
  }
  formError.value = ''
  saving.value = true
  try {
    if (editingId.value) {
      await userService.update(editingId.value, {
        fullName: values.fullName.trim(),
        role: values.role,
        department: values.department,
      })
      ui.notify('User updated')
    } else {
      await userService.create({
        fullName: values.fullName.trim(),
        username: values.username.trim(),
        password: values.password,
        role: values.role,
        department: values.department,
      })
      ui.notify('User created')
    }
    formModal.value = false
    await load()
  } catch (err) {
    showError(err, formError)
  } finally {
    saving.value = false
  }
}

async function toggleStatus(row) {
  const activating = !row.isActive
  if (!activating && (row._id === auth.user?.id || row.username === auth.user?.username)) {
    ui.notify('You cannot deactivate your own account.', 'error')
    return
  }
  const accepted = await ui.confirm({
    title: activating ? 'Activate user' : 'Deactivate user',
    message: `${activating ? 'Activate' : 'Deactivate'} ${row.fullName}? ${activating ? 'They will be able to sign in again.' : 'They will no longer be able to sign in.'}`,
    confirmText: activating ? 'Activate' : 'Deactivate',
    danger: !activating,
  })
  if (!accepted) return
  try {
    await userService.setStatus(row._id, activating)
    ui.notify(activating ? 'User activated' : 'User deactivated')
    await load()
  } catch (err) {
    showError(err)
  }
}

function openPassword(row) {
  passwordTarget.value = row
  newPassword.value = ''
  passwordError.value = ''
  passwordModal.value = true
}

async function submitPassword() {
  if (busy.value || !passwordTarget.value) return
  if (!isStrong(newPassword.value)) {
    passwordError.value = 'Password must be at least 8 characters with a letter and a number.'
    ui.notify(passwordError.value, 'error')
    return
  }
  const accepted = await ui.confirm({
    title: 'Reset password',
    message: `Replace the password for ${passwordTarget.value.fullName} with the new one?`,
    confirmText: 'Reset password',
    danger: true,
  })
  if (!accepted) return
  passwordError.value = ''
  busy.value = true
  try {
    await userService.resetPassword(passwordTarget.value._id, newPassword.value)
    ui.notify('Password reset')
    passwordModal.value = false
  } catch (err) {
    showError(err, passwordError)
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  loadDepartments()
  load()
})
</script>

<template>
  <div class="stack">
    <div class="page-header">
      <div>
        <h1>Users</h1>
        <p>Manage custodians, supply officers, and requesters.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" @click="openCreate"><Icon name="plus" :size="16" /> Add user</button>
      </div>
    </div>

    <div v-if="error" class="alert alert-error"><Icon name="warning" :size="16" /><span>{{ error }}</span></div>

    <div class="card">
      <div class="card-header">
        <h2>Accounts</h2>
        <span class="muted small">{{ pagination.total }} total</span>
      </div>
      <div class="card-body">
        <div class="toolbar no-print">
          <input v-model="filters.search" class="input search" type="search" placeholder="Search name or username" @keyup.enter="applyFilters" />
          <select v-model="filters.role" class="select" @change="applyFilters">
            <option value="">All roles</option>
            <option v-for="role in ROLES" :key="role.value" :value="role.value">{{ role.label }}</option>
          </select>
          <select v-model="filters.status" class="select" @change="applyFilters">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button class="btn btn-primary btn-sm" @click="applyFilters"><Icon name="search" :size="15" /> Search</button>
          <button class="btn btn-outline btn-sm" @click="resetFilters"><Icon name="refresh" :size="15" /> Reset</button>
        </div>

        <DataTable
          :columns="columns"
          :rows="rows"
          :loading="loading"
          empty-title="No users found"
          empty-message="Try a different search or add a new user."
        >
          <template #cell-role="{ value }">{{ roleLabel(value) }}</template>
          <template #cell-isActive="{ value }">
            <StatusBadge :status="value ? 'ACTIVE' : 'INACTIVE'" :label="value ? 'Active' : 'Inactive'" />
          </template>
          <template #cell-createdAt="{ value }">{{ formatDate(value) }}</template>
          <template #cell-actions="{ row }">
            <div class="actions">
              <button class="btn-icon" :aria-label="`Edit ${row.fullName}`" @click="openEdit(row)"><Icon name="edit" :size="15" /></button>
              <button class="btn-icon" :aria-label="`Reset password for ${row.fullName}`" @click="openPassword(row)"><Icon name="key" :size="15" /></button>
              <button
                class="btn-icon"
                :class="{ danger: row.isActive }"
                :aria-label="row.isActive ? `Deactivate ${row.fullName}` : `Activate ${row.fullName}`"
                :disabled="row.isActive && (row._id === auth.user?.id || row.username === auth.user?.username)"
                @click="toggleStatus(row)"
              ><Icon :name="row.isActive ? 'x' : 'check'" :size="15" /></button>
            </div>
          </template>
        </DataTable>
      </div>
      <Pagination
        :page="pagination.page"
        :limit="pagination.limit"
        :total="pagination.total"
        :pages="pagination.pages"
        @update:page="goToPage"
      />
    </div>

    <Modal v-if="formModal" :title="editingId ? 'Edit user' : 'Add user'" @close="formModal = false">
      <div v-if="formError" class="alert alert-error"><Icon name="warning" :size="16" /><span>{{ formError }}</span></div>
      <div class="form-grid">
        <div class="field">
          <label for="user-name">Full name</label>
          <input id="user-name" v-model="form.fullName" class="input" type="text" autocomplete="name" />
        </div>
        <div class="field">
          <label for="user-username">Username</label>
          <input id="user-username" v-model="form.username" class="input" type="text" autocomplete="username" :disabled="Boolean(editingId)" />
        </div>
        <div v-if="!editingId" class="field">
          <label for="user-password">Password</label>
          <input id="user-password" v-model="form.password" class="input" type="password" autocomplete="new-password" />
          <span class="hint">At least 8 characters with a letter and a number.</span>
        </div>
        <div class="field">
          <label for="user-role">Role</label>
          <select id="user-role" v-model="form.role" class="select">
            <option value="" disabled>Select a role</option>
            <option v-for="role in ROLES" :key="role.value" :value="role.value">{{ role.label }}</option>
          </select>
        </div>
        <div class="field">
          <label for="user-department">Department</label>
          <input id="user-department" v-model="form.department" class="input" type="text" list="department-options" />
          <datalist id="department-options">
            <option v-for="department in departments" :key="department" :value="department" />
          </datalist>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-outline" :disabled="saving" @click="formModal = false">Cancel</button>
        <button class="btn btn-primary" :disabled="saving" @click="saveForm">{{ editingId ? 'Save changes' : 'Create user' }}</button>
      </template>
    </Modal>

    <Modal v-if="passwordModal" title="Reset password" @close="passwordModal = false">
      <div v-if="passwordError" class="alert alert-error"><Icon name="warning" :size="16" /><span>{{ passwordError }}</span></div>
      <p class="muted small">Set a new password for {{ passwordTarget?.fullName }}.</p>
      <div class="field">
        <label for="new-password">New password</label>
        <input id="new-password" v-model="newPassword" class="input" type="password" autocomplete="new-password" />
        <span class="hint">At least 8 characters with a letter and a number.</span>
      </div>
      <template #footer>
        <button class="btn btn-outline" :disabled="busy" @click="passwordModal = false">Cancel</button>
        <button class="btn btn-primary" :disabled="busy" @click="submitPassword">Reset password</button>
      </template>
    </Modal>
  </div>
</template>
