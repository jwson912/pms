<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { formatDateTime } from '../utils/fee'

const NOTICE_KEY = 'parking.notices'
const PAGE_SIZE = 10
const DEFAULT_NOTICE_ID = 'default-notice'
const DEFAULT_NOTICE = {
  id: DEFAULT_NOTICE_ID,
  title: '공지사항입니다.',
  content: '공지사항 내용을 확인해주세요.',
  authorId: 'admin',
  createdAt: '2026-07-15T00:00:00+09:00',
  updatedAt: '2026-07-15T00:00:00+09:00',
  views: 0,
  comments: [],
  isDefault: true,
}

const auth = useAuthStore()
const notices = ref(readNotices())
const selectedIds = ref([])
const openedId = ref('')
const mode = ref('list')
const page = ref(1)
const form = reactive({ title: '', content: '' })
const commentForm = reactive({ content: '' })
const replyForm = reactive({ content: '' })
const replyingToId = ref('')
const error = ref('')
const commentError = ref('')
const replyError = ref('')

function readNotices() {
  try {
    const value = JSON.parse(localStorage.getItem(NOTICE_KEY) || '[]')
    const normalized = normalizeNotices(Array.isArray(value) ? value : [])
    if (JSON.stringify(value) !== JSON.stringify(normalized)) {
      localStorage.setItem(NOTICE_KEY, JSON.stringify(normalized))
    }
    return normalized
  } catch {
    localStorage.removeItem(NOTICE_KEY)
    const normalized = normalizeNotices([])
    localStorage.setItem(NOTICE_KEY, JSON.stringify(normalized))
    return normalized
  }
}

function writeNotices(next) {
  const normalized = normalizeNotices(next)
  localStorage.setItem(NOTICE_KEY, JSON.stringify(normalized))
  notices.value = normalized
}

function normalizeNotices(next) {
  const list = Array.isArray(next) ? next : []
  const defaultNotice = list.find((notice) => notice.id === DEFAULT_NOTICE_ID)
  const preservedDefault = defaultNotice
    ? {
        ...DEFAULT_NOTICE,
        views: Number(defaultNotice.views || 0),
        comments: Array.isArray(defaultNotice.comments) ? defaultNotice.comments : [],
      }
    : DEFAULT_NOTICE

  return [
    preservedDefault,
    ...list.filter((notice) => notice.id !== DEFAULT_NOTICE_ID),
  ]
}

function isDefaultNotice(notice) {
  return notice?.id === DEFAULT_NOTICE_ID
}

const sortedNotices = computed(() => [...notices.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
const totalPages = computed(() => Math.max(1, Math.ceil(sortedNotices.value.length / PAGE_SIZE)))
const pagedNotices = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return sortedNotices.value.slice(start, start + PAGE_SIZE)
})
const openedNotice = computed(() => sortedNotices.value.find((notice) => notice.id === openedId.value) || null)
const openedComments = computed(() => {
  const comments = openedNotice.value?.comments
  return Array.isArray(comments) ? comments : []
})
const threadedComments = computed(() => {
  const normalized = openedComments.value.map((comment) => ({ ...comment, parentId: comment.parentId || '' }))
  const byParentId = new Map()
  for (const comment of normalized) {
    const parentId = comment.parentId || ''
    byParentId.set(parentId, [...(byParentId.get(parentId) || []), comment])
  }

  const result = []
  const appendChildren = (parentId, depth) => {
    const children = byParentId.get(parentId) || []
    for (const child of children) {
      result.push({ ...child, depth })
      appendChildren(child.id, depth + 1)
    }
  }
  appendChildren('', 0)
  return result
})

watch(totalPages, (nextTotal) => {
  if (page.value > nextTotal) page.value = nextTotal
})

function resetForm() {
  form.title = ''
  form.content = ''
}

function resetCommentForm() {
  commentForm.content = ''
  replyForm.content = ''
  replyingToId.value = ''
  commentError.value = ''
  replyError.value = ''
}

function showList() {
  mode.value = 'list'
  openedId.value = ''
  error.value = ''
  selectedIds.value = []
  resetForm()
  resetCommentForm()
}

function showCreate() {
  mode.value = 'create'
  openedId.value = ''
  error.value = ''
  resetForm()
  resetCommentForm()
}

function showEdit() {
  if (!openedNotice.value) return
  mode.value = 'edit'
  error.value = ''
  form.title = openedNotice.value.title
  form.content = openedNotice.value.content
}

function saveNotice() {
  error.value = ''
  if (!form.title.trim() || !form.content.trim()) {
    error.value = '제목과 내용을 입력해 주세요.'
    return
  }

  const now = new Date().toISOString()
  const notice = {
    id: crypto.randomUUID(),
    title: form.title.trim(),
    content: form.content.trim(),
    authorId: auth.user?.userId || '',
    createdAt: now,
    updatedAt: now,
    views: 0,
    comments: [],
  }
  writeNotices([notice, ...notices.value])
  openedId.value = notice.id
  mode.value = 'detail'
  resetForm()
}

function updateNotice() {
  error.value = ''
  if (!openedNotice.value) {
    error.value = '수정할 게시글을 찾을 수 없습니다.'
    return
  }
  if (!form.title.trim() || !form.content.trim()) {
    error.value = '제목과 내용을 입력해 주세요.'
    return
  }

  const targetId = openedNotice.value.id
  writeNotices(notices.value.map((notice) => (
    notice.id === targetId
      ? {
          ...notice,
          title: form.title.trim(),
          content: form.content.trim(),
          updatedAt: new Date().toISOString(),
        }
      : notice
  )))
  openedId.value = targetId
  mode.value = 'detail'
  resetForm()
}

function openNotice(id) {
  openedId.value = id
  mode.value = 'detail'
  error.value = ''
  resetCommentForm()
  const next = notices.value.map((notice) => (
    notice.id === id ? { ...notice, views: Number(notice.views || 0) + 1 } : notice
  ))
  writeNotices(next)
}

function removeSelected() {
  error.value = ''
  if (selectedIds.value.length === 0) {
    error.value = '삭제할 게시글을 선택해 주세요.'
    return
  }
  if (!window.confirm('선택한 공지사항을 삭제할까요?')) return
  const targets = new Set(selectedIds.value)
  writeNotices(notices.value.filter((notice) => !targets.has(notice.id)))
  selectedIds.value = []
}

function addComment(parentId = '') {
  commentError.value = ''
  replyError.value = ''
  if (!openedNotice.value) {
    const message = '댓글을 등록할 게시글을 찾을 수 없습니다.'
    parentId ? replyError.value = message : commentError.value = message
    return
  }

  const content = parentId ? replyForm.content.trim() : commentForm.content.trim()
  if (!content) {
    const message = parentId ? '답글 내용을 입력해 주세요.' : '댓글 내용을 입력해 주세요.'
    parentId ? replyError.value = message : commentError.value = message
    return
  }

  const targetId = openedNotice.value.id
  const comment = {
    id: crypto.randomUUID(),
    parentId,
    content,
    authorId: auth.user?.userId || '',
    createdAt: new Date().toISOString(),
  }

  writeNotices(notices.value.map((notice) => (
    notice.id === targetId
      ? {
          ...notice,
          comments: [...(Array.isArray(notice.comments) ? notice.comments : []), comment],
          updatedAt: notice.updatedAt || notice.createdAt,
        }
      : notice
  )))
  if (parentId) {
    replyForm.content = ''
    replyingToId.value = ''
    replyError.value = ''
  } else {
    commentForm.content = ''
    commentError.value = ''
  }
}

function canRemoveComment(comment) {
  return auth.isAdmin || comment.authorId === auth.user?.userId
}

function removeComment(commentId) {
  if (!openedNotice.value) return
  if (!window.confirm('댓글을 삭제할까요?')) return

  const targetId = openedNotice.value.id
  writeNotices(notices.value.map((notice) => (
    notice.id === targetId ? { ...notice, comments: removeCommentBranch(notice.comments, commentId) } : notice
  )))
}

function removeCommentBranch(comments, commentId) {
  const allComments = Array.isArray(comments) ? comments : []
  const targets = new Set([commentId])
  let changed = true
  while (changed) {
    changed = false
    for (const comment of allComments) {
      if (!targets.has(comment.id) && targets.has(comment.parentId)) {
        targets.add(comment.id)
        changed = true
      }
    }
  }
  return allComments.filter((comment) => !targets.has(comment.id))
}

function showReplyForm(commentId) {
  replyingToId.value = commentId
  replyForm.content = ''
  replyError.value = ''
}

function cancelReply() {
  replyingToId.value = ''
  replyForm.content = ''
  replyError.value = ''
}
</script>

<template>
  <section>
    <div class="page-head">
      <h2>공지사항</h2>
      <div v-if="mode === 'list'" class="header-actions">
        <button v-if="auth.isAdmin" class="btn btn-primary small" type="button" @click="showCreate">
          등록
        </button>
        <button
          v-if="auth.isAdmin"
          class="btn btn-danger small"
          type="button"
          @click="removeSelected"
        >
          삭제
        </button>
      </div>
      <div v-else-if="mode === 'create'" class="header-actions">
        <button v-if="auth.isAdmin" class="btn btn-primary small" type="button" @click="saveNotice">
          등록
        </button>
      </div>
      <div v-else-if="mode === 'detail'" class="header-actions">
        <button v-if="auth.isAdmin && !isDefaultNotice(openedNotice)" class="btn btn-primary small" type="button" @click="showEdit">
          수정
        </button>
        <button class="btn btn-light small" type="button" @click="showList">목록</button>
      </div>
      <div v-else class="header-actions">
        <button v-if="auth.isAdmin" class="btn btn-primary small" type="button" @click="updateNotice">
          수정
        </button>
        <button class="btn btn-light small" type="button" @click="showList">목록</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="mode === 'list'">
      <div class="panel toolbar board-toolbar">
        <strong>공지사항 게시판</strong>
        <span class="muted">총 {{ sortedNotices.length }}건</span>
      </div>

      <div class="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th v-if="auth.isAdmin">선택</th>
              <th>번호</th>
              <th>제목</th>
              <th>작성자</th>
              <th>작성일</th>
              <th>조회</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(notice, index) in pagedNotices" :key="notice.id">
              <td v-if="auth.isAdmin">
                <input
                  v-model="selectedIds"
                  type="checkbox"
                  :value="notice.id"
                  :disabled="isDefaultNotice(notice)"
                  :title="isDefaultNotice(notice) ? '기본 공지사항은 삭제할 수 없습니다.' : ''"
                />
              </td>
              <td>{{ sortedNotices.length - ((page - 1) * PAGE_SIZE + index) }}</td>
              <td>
                <button class="link-button" type="button" @click="openNotice(notice.id)">
                  {{ notice.title }}
                </button>
              </td>
              <td>{{ notice.authorId || notice.authorEmail || '-' }}</td>
              <td>{{ formatDateTime(notice.createdAt) }}</td>
              <td>{{ notice.views || 0 }}</td>
            </tr>
            <tr v-if="sortedNotices.length === 0">
              <td :colspan="auth.isAdmin ? 6 : 5" class="empty">등록된 공지사항이 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button class="btn btn-light small" type="button" :disabled="page === 1" @click="page -= 1">
          이전
        </button>
        <button
          v-for="pageNumber in totalPages"
          :key="pageNumber"
          class="btn small"
          :class="pageNumber === page ? 'btn-primary' : 'btn-light'"
          type="button"
          @click="page = pageNumber"
        >
          {{ pageNumber }}
        </button>
        <button class="btn btn-light small" type="button" :disabled="page === totalPages" @click="page += 1">
          다음
        </button>
      </div>
    </template>

    <form v-else-if="mode === 'create'" class="panel form notice-form" @submit.prevent="saveNotice">
      <label>제목</label>
      <input v-model.trim="form.title" placeholder="공지 제목" />
      <label>내용</label>
      <textarea v-model.trim="form.content" placeholder="공지 내용을 입력하세요."></textarea>
    </form>

    <article v-else-if="mode === 'detail' && openedNotice" class="panel board-detail">
      <h3>{{ openedNotice.title }}</h3>
      <span class="muted">
        {{ openedNotice.authorId || openedNotice.authorEmail || '-' }} · {{ formatDateTime(openedNotice.createdAt) }} · 조회 {{ openedNotice.views || 0 }}
      </span>
      <p class="notice-content">{{ openedNotice.content }}</p>

      <section class="comments">
        <div class="comments-head">
          <strong>댓글 {{ openedComments.length }}</strong>
        </div>

        <div class="comment-list">
          <article
            v-for="comment in threadedComments"
            :key="comment.id"
            class="comment-item"
            :class="{ 'is-reply': comment.depth > 0 }"
            :style="{ marginLeft: `${Math.min(comment.depth, 4) * 28}px` }"
          >
            <div class="comment-meta">
              <strong>{{ comment.authorId || '-' }}</strong>
              <span>{{ formatDateTime(comment.createdAt) }}</span>
            </div>
            <p>{{ comment.content }}</p>
            <div class="comment-tools">
              <button class="link-button" type="button" @click="showReplyForm(comment.id)">답글</button>
              <button
                v-if="canRemoveComment(comment)"
                class="link-button"
                type="button"
                @click="removeComment(comment.id)"
              >
                삭제
              </button>
            </div>
            <form v-if="replyingToId === comment.id" class="comment-form reply-form" @submit.prevent="addComment(comment.id)">
              <textarea v-model.trim="replyForm.content" placeholder="답글을 입력하세요."></textarea>
              <div class="comment-actions">
                <p v-if="replyError" class="error">{{ replyError }}</p>
                <div>
                  <button class="btn btn-light small" type="button" @click="cancelReply">취소</button>
                  <button class="btn btn-primary small" type="submit">등록</button>
                </div>
              </div>
            </form>
          </article>
          <p v-if="openedComments.length === 0" class="empty comment-empty">등록된 댓글이 없습니다.</p>
        </div>

        <form class="comment-form comment-create-form" @submit.prevent="addComment()">
          <textarea v-model.trim="commentForm.content" placeholder="댓글을 입력하세요."></textarea>
          <div class="comment-actions">
            <p v-if="commentError" class="error">{{ commentError }}</p>
            <button class="btn btn-primary small" type="submit">등록</button>
          </div>
        </form>
      </section>
    </article>

    <form v-else-if="mode === 'edit' && openedNotice" class="panel form notice-form" @submit.prevent="updateNotice">
      <label>제목</label>
      <input v-model.trim="form.title" placeholder="공지 제목" />
      <label>내용</label>
      <textarea v-model.trim="form.content" placeholder="공지 내용을 입력하세요."></textarea>
    </form>
  </section>
</template>
