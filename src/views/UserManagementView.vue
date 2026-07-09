<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { formatDateTime } from '../utils/fee'

const auth = useAuthStore()
const selectedIds = ref([])
const message = ref('')
const error = ref('')

const users = computed(() => [...auth.profiles].sort((a, b) => a.userId.localeCompare(b.userId)))

function refresh() {
  auth.loadLocalProfiles()
}

function changeRole(user, event) {
  message.value = ''
  error.value = ''
  const role = event.target.value
  if (auth.updateUserRole(user.userId, role)) {
    message.value = `${user.userId} 권한을 ${role}로 변경했습니다.`
    refresh()
  } else {
    error.value = '권한 변경에 실패했습니다.'
  }
}

function deleteSelected() {
  message.value = ''
  error.value = ''
  if (selectedIds.value.length === 0) {
    error.value = '삭제할 사용자를 선택해 주세요.'
    return
  }
  if (selectedIds.value.includes(auth.user?.userId)) {
    error.value = '현재 로그인한 본인 계정은 삭제할 수 없습니다.'
    return
  }
  if (!window.confirm('선택한 사용자 계정을 삭제할까요?')) return
  auth.deleteUsers(selectedIds.value)
  message.value = '선택한 사용자 계정을 삭제했습니다.'
  selectedIds.value = []
  refresh()
}
</script>

<template>
  <section>
    <h2>사용자 관리</h2>
    <div class="panel toolbar board-toolbar">
      <strong>등록된 사용자</strong>
      <button class="btn btn-danger small" type="button" @click="deleteSelected">선택 삭제</button>
    </div>
    <p v-if="message" class="success">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="panel table-wrap">
      <table>
        <thead>
          <tr>
            <th>선택</th>
            <th>아이디</th>
            <th>권한</th>
            <th>비밀번호</th>
            <th>생성일</th>
            <th>마지막 로그인</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.userId">
            <td>
              <input
                v-model="selectedIds"
                type="checkbox"
                :value="user.userId"
                :disabled="user.userId === auth.user?.userId"
              />
            </td>
            <td>{{ user.userId }}</td>
            <td>
              <select :value="user.role" @change="changeRole(user, $event)">
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </td>
            <td>{{ user.password }}</td>
            <td>{{ formatDateTime(user.createdAt) }}</td>
            <td>{{ user.lastSignInAt ? formatDateTime(user.lastSignInAt) : '-' }}</td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="6" class="empty">등록된 사용자가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
