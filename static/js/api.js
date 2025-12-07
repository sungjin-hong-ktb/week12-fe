// API 유틸리티 함수

const API_BASE_URL = '';

// 로컬 스토리지 관리
const storage = {
    getToken: () => localStorage.getItem('access_token'),
    setToken: (token) => localStorage.setItem('access_token', token),
    removeToken: () => localStorage.removeItem('access_token'),
    getUserId: () => localStorage.getItem('user_id'),
    setUserId: (id) => localStorage.setItem('user_id', id),
    removeUserId: () => localStorage.removeItem('user_id'),
    clear: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
    }
};

// API 요청 헬퍼
async function apiRequest(url, options = {}) {
    try {
        const token = storage.getToken();
        const userId = storage.getUserId();

        const headers = {
            ...options.headers
        };

        // JSON 요청인 경우
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        // URLSearchParams는 문자열로 변환
        if (options.body instanceof URLSearchParams) {
            options.body = options.body.toString();
        }

        // 토큰이 있으면 Authorization 헤더 추가
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(API_BASE_URL + url, {
            ...options,
            headers
        });

        // 204 No Content 처리
        if (response.status === 204) {
            return { success: true };
        }

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            // 인증 오류 처리
            if (response.status === 401) {
                storage.clear();
                if (window.location.pathname !== '/' && window.location.pathname !== '/signup') {
                    window.location.href = '/';
                }
                throw new Error(data.detail || data.message || '인증이 필요합니다');
            }

            // 에러 메시지 추출
            let errorMessage = `HTTP error! status: ${response.status}`;

            if (typeof data === 'string') {
                errorMessage = data;
            } else if (data.detail) {
                // FastAPI 표준 에러 형식
                if (typeof data.detail === 'string') {
                    errorMessage = data.detail;
                } else if (Array.isArray(data.detail)) {
                    // 유효성 검사 에러
                    errorMessage = data.detail.map(err => err.msg).join(', ');
                }
            } else if (data.message) {
                errorMessage = data.message;
            } else if (data.error) {
                errorMessage = data.error;
            }

            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// API 함수들
const api = {
    // 인증
    auth: {
        login: async (email, password) => {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            return apiRequest('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });
        },
        logout: () => {
            storage.clear();
            window.location.href = '/';
        }
    },

    // 사용자
    users: {
        create: async (userData) => {
            return apiRequest('/api/users', {
                method: 'POST',
                body: userData
            });
        },
        get: async (userId) => {
            return apiRequest(`/api/users/${userId}`);
        },
        update: async (userId, userData) => {
            return apiRequest(`/api/users/${userId}`, {
                method: 'PUT',
                body: userData
            });
        },
        updatePassword: async (userId, password) => {
            return apiRequest(`/api/users/${userId}/password`, {
                method: 'PATCH',
                body: { password }
            });
        },
        delete: async (userId) => {
            return apiRequest(`/api/users/${userId}`, {
                method: 'DELETE'
            });
        }
    },

    // 게시글
    posts: {
        list: async (skip = 0, limit = 26) => {
            return apiRequest(`/api/posts?skip=${skip}&limit=${limit}`);
        },
        get: async (postId) => {
            return apiRequest(`/api/posts/${postId}`);
        },
        create: async (postData) => {
            return apiRequest('/api/posts', {
                method: 'POST',
                body: postData
            });
        },
        update: async (postId, postData) => {
            return apiRequest(`/api/posts/${postId}`, {
                method: 'PUT',
                body: postData
            });
        },
        delete: async (postId) => {
            return apiRequest(`/api/posts/${postId}`, {
                method: 'DELETE'
            });
        }
    },

    // 댓글
    comments: {
        list: async (postId, skip = 0, limit = 100) => {
            return apiRequest(`/api/posts/${postId}/comments?skip=${skip}&limit=${limit}`);
        },
        create: async (postId, content) => {
            return apiRequest(`/api/posts/${postId}/comments`, {
                method: 'POST',
                body: { content }
            });
        },
        update: async (commentId, content) => {
            return apiRequest(`/api/comments/${commentId}`, {
                method: 'PUT',
                body: { content }
            });
        },
        delete: async (commentId) => {
            return apiRequest(`/api/comments/${commentId}`, {
                method: 'DELETE'
            });
        }
    },

    // 파일
    files: {
        upload: async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            return apiRequest('/api/files/upload', {
                method: 'POST',
                body: formData
            });
        }
    },
    
    // 좋아요
    likes: {
        toggle: async (postId) => {
            return apiRequest(`/api/posts/${postId}/like`, {
                method: 'POST'
            });
        },
        getStatus: async (postId) => {
            return apiRequest(`/api/posts/${postId}/like`);
        }
    }
};

// 유틸리티 함수들
const utils = {
    // 이메일 유효성 검사
    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // 비밀번호 유효성 검사
    validatePassword: (password) => {
        const re = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
        return re.test(password);
    },

    // 닉네임 유효성 검사
    validateNickname: (nickname) => {
        return nickname && nickname.length <= 10 && !/\s/.test(nickname);
    },

    // 숫자 포맷팅
    formatNumber: (num) => {
        if (num >= 100000) {
            return Math.floor(num / 1000) + 'k';
        } else if (num >= 10000) {
            return Math.floor(num / 1000) + 'k';
        } else if (num >= 1000) {
            return Math.floor(num / 1000) + 'k';
        }
        return num.toString();
    },

    // 날짜 포맷팅
    formatDate: (dateString) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },

    // 토스트 메시지 생성
    createToast: (message, type = 'success') => {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // 애니메이션을 위한 리플로우
        void toast.offsetWidth;

        toast.classList.add('show');

        // 3초 후 사라짐
        setTimeout(() => {
            toast.classList.remove('show');
            // 애니메이션 완료 후 DOM 제거
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    },

    // 에러 메시지 표시 (Toast)
    showError: (message) => {
        utils.createToast(message || '오류가 발생했습니다', 'error');
    },

    // 성공 메시지 표시 (Toast)
    showSuccess: (message) => {
        utils.createToast(message, 'success');
    },

    // 인증 확인
    checkAuth: () => {
        const token = storage.getToken();
        if (!token) {
            window.location.href = '/';
            return false;
        }
        return true;
    },

    // 사용자 프로필 이미지 로드
    loadUserProfileImage: async () => {
        try {
            const userId = storage.getUserId();
            if (!userId) return;

            const user = await api.users.get(userId);
            const userIcon = document.getElementById('userIcon');

            if (userIcon && user.profile_image) {
                userIcon.style.backgroundImage = `url('${user.profile_image}')`;
                userIcon.style.backgroundSize = 'cover';
                userIcon.style.backgroundPosition = 'center';
            }
        } catch (error) {
            console.error('프로필 이미지 로드 실패:', error);
        }
    }
};
