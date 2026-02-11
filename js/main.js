// ==========================================
// 전역 변수
// ==========================================
let students = [];
let teachers = [];
let assignments = [];
let testResults = [];
let currentStudent = null;

// Supabase 설정
const SUPABASE_URL = 'https://hsnhzedcrlpxxravhrff.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzbmh6ZWRjcmxweHhyYXZocmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3ODUzMDgsImV4cCI6MjA4NjM2MTMwOH0.Hr8h4m-ZAngeUIflrU9ML0KiP5eUEM5X_JHUUdwVRWE';

// Supabase API 헬퍼 함수
function getSupabaseHeaders() {
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
}

// ==========================================
// 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    setupEventListeners();
    renderStudentsTable();
    updateStats();
});

// ==========================================
// 데이터 로딩
// ==========================================
async function loadAllData() {
    try {
        const headers = getSupabaseHeaders();

        // 모든 데이터 로드
        const [teachersRes, studentsRes, assignmentsRes, testResultsRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/teachers?select=*&limit=100`, { headers }),
            fetch(`${SUPABASE_URL}/rest/v1/students?select=*&limit=100`, { headers }),
            fetch(`${SUPABASE_URL}/rest/v1/assignments?select=*&limit=100`, { headers }),
            fetch(`${SUPABASE_URL}/rest/v1/test_results?select=*&limit=100`, { headers })
        ]);

        teachers = await teachersRes.json() || [];
        students = await studentsRes.json() || [];
        assignments = await assignmentsRes.json() || [];
        testResults = await testResultsRes.json() || [];

        console.log('데이터 로드 완료:', { students, teachers, assignments, testResults });
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        alert('데이터를 불러오는 데 실패했습니다.');
    }
}

// ==========================================
// 유틸리티 함수: 연락처 & 금액 포맷팅
// ==========================================
function formatPhoneNumber(value) {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    
    if (numbers.length <= 3) {
        return numbers;
    } else if (numbers.length <= 7) {
        return numbers.slice(0, 3) + '-' + numbers.slice(3);
    } else if (numbers.length <= 10) {
        return numbers.slice(0, 3) + '-' + numbers.slice(3, 6) + '-' + numbers.slice(6);
    } else {
        return numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7, 11);
    }
}

function formatAmountNumber(value) {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    // 콤마 추가
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ==========================================
// 이벤트 리스너 설정
// ==========================================
function setupEventListeners() {
    try {
        // 검색
        document.getElementById('searchInput').addEventListener('input', handleSearch);
        
        // 신규 학생 등록 모달
        document.getElementById('addStudentBtn').addEventListener('click', () => {
            document.getElementById('addStudentModal').classList.add('active');
        });
        
        document.getElementById('closeAddStudentModal').addEventListener('click', closeAddStudentModal);
        document.getElementById('cancelAddStudent').addEventListener('click', closeAddStudentModal);
        
        // 신규 학생 등록 폼
        document.getElementById('addStudentForm').addEventListener('submit', handleAddStudent);
        
        // 연락처 자동 포맷팅 - 신규 학생 등록
        const newStudentPhone = document.getElementById('newStudentPhone');
        if (newStudentPhone) {
            newStudentPhone.addEventListener('input', function(e) {
                const formatted = formatPhoneNumber(e.target.value);
                e.target.value = formatted;
            });
        }
        
        // 연락처 자동 포맷팅 - 기본정보 수정
        const editPhone = document.getElementById('editPhone');
        if (editPhone) {
            editPhone.addEventListener('input', function(e) {
                const formatted = formatPhoneNumber(e.target.value);
                e.target.value = formatted;
            });
        }
        
        // 입금액 자동 콤마 포맷팅 - 신규 학생 등록 (기타정보)
        const newStudentAmount = document.getElementById('newStudentAmount');
        if (newStudentAmount) {
            newStudentAmount.addEventListener('input', function(e) {
                const formatted = formatAmountNumber(e.target.value);
                e.target.value = formatted;
            });
        }
        
        // 입금액 자동 콤마 포맷팅 - 진행현황 수정
        const editProgressAmount = document.getElementById('editProgressAmount');
        if (editProgressAmount) {
            editProgressAmount.addEventListener('input', function(e) {
                const formatted = formatAmountNumber(e.target.value);
                e.target.value = formatted;
            });
        }
        
        // 성적 타입 선택 시 해당 필드 표시
        document.getElementById('newStudentScoreType').addEventListener('change', (e) => {
            const oldFields = document.getElementById('oldScoreFields');
            const newFields = document.getElementById('newScoreFields');
            const oldTotal = document.getElementById('oldTotal');
            const newTotal = document.getElementById('newTotal');
            
            if (e.target.value === 'old') {
                oldFields.style.display = 'block';
                newFields.style.display = 'none';
                oldTotal.required = true;
                newTotal.required = false;
            } else if (e.target.value === 'new') {
                oldFields.style.display = 'none';
                newFields.style.display = 'block';
                oldTotal.required = false;
                newTotal.required = true;
            } else {
                oldFields.style.display = 'none';
                newFields.style.display = 'none';
                oldTotal.required = false;
                newTotal.required = false;
            }
        });
        
        // 목표 성적 입력 방식 전환
        document.getElementById('targetInputMode').addEventListener('change', (e) => {
            const sectionsInput = document.getElementById('targetSectionsInput');
            const totalInput = document.getElementById('targetTotalInput');
            
            if (e.target.value === 'sections') {
                sectionsInput.style.display = 'block';
                totalInput.style.display = 'none';
            } else {
                sectionsInput.style.display = 'none';
                totalInput.style.display = 'block';
            }
        });
        
        // 학생 상세 모달 닫기
        document.getElementById('closeDetailModal').addEventListener('click', closeDetailModal);
        
        // 학생 삭제
        document.getElementById('deleteStudentBtn').addEventListener('click', handleDeleteStudent);
        
        // 탭 전환
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                switchTab(tabName);
            });
        });
        
        // 기본정보 수정
        document.getElementById('editBasicInfo').addEventListener('click', openEditBasicInfoModal);
        document.getElementById('closeEditBasicInfo').addEventListener('click', closeEditBasicInfoModal);
        document.getElementById('cancelEditBasicInfo').addEventListener('click', closeEditBasicInfoModal);
        document.getElementById('editBasicInfoForm').addEventListener('submit', handleEditBasicInfo);
        
        // 성적 수정
        document.getElementById('editScores').addEventListener('click', openEditScoresModal);
        document.getElementById('closeEditScores').addEventListener('click', closeEditScoresModal);
        document.getElementById('cancelEditScores').addEventListener('click', closeEditScoresModal);
        document.getElementById('editScoresForm').addEventListener('submit', handleEditScores);
        
        // 성적 수정 모달의 성적 타입 선택
        document.getElementById('editScoreType').addEventListener('change', (e) => {
            const oldFields = document.getElementById('editOldScoreFields');
            const newFields = document.getElementById('editNewScoreFields');
            
            if (e.target.value === 'old') {
                oldFields.style.display = 'block';
                newFields.style.display = 'none';
            } else if (e.target.value === 'new') {
                oldFields.style.display = 'none';
                newFields.style.display = 'block';
            }
        });
        
        // 진행현황 수정
        document.getElementById('editProgress').addEventListener('click', openEditProgressModal);
        document.getElementById('closeEditProgress').addEventListener('click', closeEditProgressModal);
        document.getElementById('cancelEditProgress').addEventListener('click', closeEditProgressModal);
        document.getElementById('editProgressForm').addEventListener('submit', handleEditProgress);
        
        // 시험 결과 추가
        document.getElementById('addTestResult').addEventListener('click', openAddTestResultModal);
        document.getElementById('closeAddTestResult').addEventListener('click', closeAddTestResultModal);
        document.getElementById('cancelAddTestResult').addEventListener('click', closeAddTestResultModal);
        document.getElementById('addTestResultForm').addEventListener('submit', handleAddTestResult);
        
        // 스라첨삭 슬롯 선택
        document.getElementById('closeSraSlotModal').addEventListener('click', closeSraSlotModal);
        document.getElementById('cancelSraSlot').addEventListener('click', closeSraSlotModal);
        
        // 배정 확인
        document.getElementById('closeAssignConfirm').addEventListener('click', closeAssignConfirmModal);
        document.getElementById('cancelAssignConfirm').addEventListener('click', closeAssignConfirmModal);
        document.getElementById('confirmAssignBtn').addEventListener('click', handleConfirmAssignment);
        
        // 슬롯 조회
        const viewSlotsBtn = document.getElementById('viewSlotsBtn');
        const slotStatusCard = document.getElementById('slotStatusCard');
        const closeViewSlotsMod = document.getElementById('closeViewSlotsModal');
        const closeViewSlotsModalBtn = document.getElementById('closeViewSlotsModalBtn');
        
        if (viewSlotsBtn) {
            viewSlotsBtn.addEventListener('click', openViewSlotsModal);
        }
        
        if (slotStatusCard) {
            slotStatusCard.addEventListener('click', openViewSlotsModal);
        }
        
        if (closeViewSlotsMod) {
            closeViewSlotsMod.addEventListener('click', () => {
                document.getElementById('viewSlotsModal').classList.remove('active');
            });
        }
        
        if (closeViewSlotsModalBtn) {
            closeViewSlotsModalBtn.addEventListener('click', () => {
                document.getElementById('viewSlotsModal').classList.remove('active');
            });
        }
        
        // 엑셀 다운로드
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', exportToExcel);
        }
        
    } catch (error) {
        console.error('❌ 이벤트 리스너 등록 오류:', error);
    }
}

// ==========================================
// 검색 기능
// ==========================================
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    renderStudentsTable(searchTerm);
}

// ==========================================
// 통계 업데이트
// ==========================================
function updateStats() {
    const total = students.length;
    const today = new Date();
    
    // 챌린지 진행중인 학생 (시작일 <= 오늘 <= 종료일)
    const ongoing = students.filter(s => {
        if (!s.challenge_start_date || !s.challenge_end_date) return false;
        const start = new Date(s.challenge_start_date);
        const end = new Date(s.challenge_end_date);
        return today >= start && today <= end;
    }).length;
    
    // 완료 학생 (status가 완료인 학생)
    const completed = students.filter(s => s.status === '완료').length;
    
    // 첨삭 대기중 (첨삭 신청했지만 미배정)
    const waiting = students.filter(s => {
        const sraEnabled = s.sra_enabled !== false && s.program_type && s.program_type.endsWith('_sra');
        return sraEnabled && s.status === '대기';
    }).length;
    
    // 첨삭 배정완료
    const assigned = students.filter(s => s.status === '배정완료').length;
    
    document.getElementById('totalStudents').textContent = total;
    document.getElementById('ongoingStudents').textContent = ongoing;
    document.getElementById('completedStudents').textContent = completed;
    document.getElementById('waitingStudents').textContent = waiting;
    document.getElementById('assignedStudents').textContent = assigned;
    
    // 슬롯 현황 계산
    const totalSlots = teachers.length * 4; // 선생님당 최대 4명
    const usedSlots = assignments.filter(a => a.status !== '완료').length;
    const availableSlots = totalSlots - usedSlots;
    
    document.getElementById('availableSlots').textContent = `${availableSlots}/${totalSlots}`;
}

// ==========================================
// 학생 목록 테이블 렌더링
// ==========================================
function renderStudentsTable(searchTerm = '') {
    const tbody = document.getElementById('studentsTableBody');
    
    // 필터링
    let filteredStudents = students;
    if (searchTerm) {
        filteredStudents = students.filter(s => 
            s.name?.toLowerCase().includes(searchTerm) || 
            s.phone?.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="8">
                    <div style="padding: 40px; text-align: center;">
                        <i class="fas fa-user-plus" style="font-size: 3rem; color: #ccc; margin-bottom: 15px; display: block;"></i>
                        <h4 style="color: var(--text-color); margin-bottom: 10px;">아직 등록된 학생이 없습니다</h4>
                        <p style="color: #999; font-size: 0.9rem;">
                            상단의 [학생 등록] 버튼을 눌러 첫 번째 학생을 등록하세요.
                        </p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredStudents.map(student => {
        // 프로그램 타입 표시
        let programBadge = '';
        if (student.program_type === 'fast_only') {
            programBadge = '<span class="badge badge-fast">Fast (4주)</span>';
        } else if (student.program_type === 'fast_sra') {
            programBadge = '<span class="badge badge-fast">Fast (4주) + 첨삭</span>';
        } else if (student.program_type === 'standard_only') {
            programBadge = '<span class="badge badge-standard">Standard (8주)</span>';
        } else if (student.program_type === 'standard_sra') {
            programBadge = '<span class="badge badge-standard">Standard (8주) + 첨삭</span>';
        } else {
            // 기존 데이터 호환성 (fast, standard)
            programBadge = student.program_type === 'fast' 
                ? '<span class="badge badge-fast">Fast (4주)</span>' 
                : '<span class="badge badge-standard">Standard (8주)</span>';
        }
        
        const currentScore = getScoreDisplay(student, 'current');
        const targetScore = getScoreDisplay(student, 'target');
        
        const challengePeriod = student.challenge_start_date && student.challenge_end_date
            ? `${student.challenge_start_date} ~ ${student.challenge_end_date}`
            : '-';
        
        // 첨삭 상태
        let sraStatus = '-';
        let sraStatusClass = '';
        
        // 첨삭 신청 여부 확인
        const sraEnabled = student.sra_enabled !== false && student.program_type && student.program_type.endsWith('_sra');
        
        if (!sraEnabled) {
            // 첨삭 신청 안 함
            sraStatus = '-';
            sraStatusClass = '';
        } else {
            // 첨삭 신청함 -> 배정 상태 확인
            const sraAssignment = assignments.find(a => a.student_id === student.id && a.status !== '완료');
            
            if (sraAssignment) {
                if (sraAssignment.status === '진행중') {
                    sraStatus = '진행중';
                    sraStatusClass = 'badge-active';
                } else if (sraAssignment.status === '예정') {
                    sraStatus = '배정완료';
                    sraStatusClass = 'badge-success';
                }
            } else {
                sraStatus = '미배정';
                sraStatusClass = 'badge-waiting';
            }
        }
        
        // 신청 단계
        const stepsCompleted = [
            student.contract_completed,
            student.delivery_completed,
            student.access_completed,
            student.notification_completed
        ].filter(Boolean).length;
        const stepDisplay = `${stepsCompleted}/4`;
        
        return `
            <tr onclick="showStudentDetail('${student.id}')">
                <td><strong>${student.name || '-'}</strong></td>
                <td>${student.phone || '-'}</td>
                <td>${programBadge}</td>
                <td>${currentScore} → ${targetScore}</td>
                <td><small>${challengePeriod}</small></td>
                <td>${sraStatusClass ? `<span class="badge ${sraStatusClass}">${sraStatus}</span>` : sraStatus}</td>
                <td>${stepDisplay}</td>
                <td>
                    <button class="btn btn-sm btn-primary btn-icon" onclick="event.stopPropagation(); showStudentDetail('${student.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==========================================
// 성적 표시 헬퍼
// ==========================================
function getScoreDisplay(student, type) {
    if (type === 'current') {
        if (student.current_score_type === 'old') {
            return student.old_score_total ? `${student.old_score_total}점` : '-';
        } else if (student.current_score_type === 'new') {
            return student.current_total_level ? `${Number(student.current_total_level).toFixed(1)}` : '-';
        }
    } else if (type === 'target') {
        return student.target_level ? `${Number(student.target_level).toFixed(1)}` : '-';
    }
    return '-';
}

// ==========================================
// 신규 학생 등록
// ==========================================
async function handleAddStudent(e) {
    e.preventDefault();
    
    console.log('=== 학생 등록 시작 ===');
    
    const name = document.getElementById('newStudentName').value.trim();
    const phone = document.getElementById('newStudentPhone').value.trim();
    const programType = document.getElementById('newStudentProgram').value;
    const startDate = document.getElementById('newStudentStartDate').value;
    const scoreType = document.getElementById('newStudentScoreType').value;
    
    console.log('입력값:', { name, phone, programType, startDate, scoreType });
    
    if (!name || !phone || !programType || !startDate || !scoreType) {
        alert('필수 항목을 모두 입력해주세요.');
        return;
    }
    
    // 챌린지 종료일 계산
    const challengeStart = new Date(startDate);
    const challengeEnd = new Date(challengeStart);
    
    // 프로그램 타입에서 기간 추출 (fast_only, fast_sra -> fast, standard_only, standard_sra -> standard)
    const programDuration = programType.startsWith('fast') ? 4 : 8;
    const sraEnabled = programType.endsWith('_sra');
    
    challengeEnd.setDate(challengeStart.getDate() + (programDuration * 7) - 1);
    
    // 스라첨삭 시작 가능일 계산 (첨삭 신청한 경우만)
    let sraStart = null;
    if (sraEnabled) {
        sraStart = new Date(challengeEnd);
        sraStart.setDate(sraStart.getDate() + 1);
        const dayOfWeek = sraStart.getDay();
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        sraStart.setDate(sraStart.getDate() + daysUntilSunday);
    }
    
    // 학생 데이터 구성
    const studentData = {
        name,
        phone,
        program_type: programType,
        challenge_start_date: formatDateForDB(challengeStart),
        challenge_end_date: formatDateForDB(challengeEnd),
        sra_available_date: sraEnabled ? formatDateForDB(sraStart) : null,
        status: '대기',
        current_score_type: scoreType,
        sra_enabled: sraEnabled
    };
    
    // 성적 데이터 추가
    if (scoreType === 'old') {
        // 개정전 - 섹션별은 선택, 총점은 필수
        studentData.old_score_reading = parseFloat(document.getElementById('oldReading').value) || 0;
        studentData.old_score_listening = parseFloat(document.getElementById('oldListening').value) || 0;
        studentData.old_score_speaking = parseFloat(document.getElementById('oldSpeaking').value) || 0;
        studentData.old_score_writing = parseFloat(document.getElementById('oldWriting').value) || 0;
        studentData.old_score_total = parseFloat(document.getElementById('oldTotal').value) || 0;
    } else {
        // 개정후 - 섹션별은 선택, 총 레벨은 필수
        studentData.current_level_reading = parseFloat(document.getElementById('newReading').value) || 0;
        studentData.current_level_listening = parseFloat(document.getElementById('newListening').value) || 0;
        studentData.current_level_speaking = parseFloat(document.getElementById('newSpeaking').value) || 0;
        studentData.current_level_writing = parseFloat(document.getElementById('newWriting').value) || 0;
        studentData.current_total_level = parseFloat(document.getElementById('newTotal').value) || 0;
    }
    
    // 목표 성적 (개정후만)
    const targetInputMode = document.getElementById('targetInputMode').value;
    
    if (targetInputMode === 'sections') {
        // 섹션별 입력
        studentData.target_reading = parseFloat(document.getElementById('targetReading').value) || 0;
        studentData.target_listening = parseFloat(document.getElementById('targetListening').value) || 0;
        studentData.target_speaking = parseFloat(document.getElementById('targetSpeaking').value) || 0;
        studentData.target_writing = parseFloat(document.getElementById('targetWriting').value) || 0;
        
        const targetAvg = (studentData.target_reading + studentData.target_listening + 
                           studentData.target_speaking + studentData.target_writing) / 4;
        studentData.target_level = Math.round(targetAvg * 2) / 2;
    } else {
        // 총점만 입력
        const directTotal = parseFloat(document.getElementById('targetTotalDirect').value) || 0;
        studentData.target_level = directTotal;
        // 섹션별 점수는 0으로 설정
        studentData.target_reading = 0;
        studentData.target_listening = 0;
        studentData.target_speaking = 0;
        studentData.target_writing = 0;
    }
    
    // 기타 정보
    const lastTestDate = document.getElementById('lastTestDate').value;
    if (lastTestDate) {
        studentData.last_test_date = lastTestDate;
    }
    
    const paymentAmountStr = document.getElementById('newStudentAmount').value;
    if (paymentAmountStr) {
        // 콤마 제거 후 숫자로 변환
        const cleaned = paymentAmountStr.replace(/,/g, '');
        studentData.payment_amount = parseFloat(cleaned) || 0;
    }
    
    // 신청 단계 기본값
    studentData.contract_completed = false;
    studentData.delivery_completed = false;
    studentData.access_completed = false;
    studentData.notification_completed = false;
    studentData.review_submitted = false;
    studentData.settlement_completed = false;
    
    try {
        console.log('학생 데이터:', studentData);
        console.log('API 호출 시작...');
        
        const headers = getSupabaseHeaders();
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(studentData)
        });
        
        console.log('API 응답:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('학생 등록 실패 응답:', response.status, errorText);
            throw new Error(`학생 등록 실패: ${response.status} - ${errorText}`);
        }
        
        alert(`${name} 학생이 등록되었습니다!`);
        closeAddStudentModal();
        document.getElementById('addStudentForm').reset();
        
        // 데이터 새로고침
        await loadAllData();
        renderStudentsTable();
        updateStats();
        
    } catch (error) {
        console.error('학생 등록 오류:', error);
        alert('학생 등록 중 오류가 발생했습니다.');
    }
}

function closeAddStudentModal() {
    document.getElementById('addStudentModal').classList.remove('active');
    document.getElementById('addStudentForm').reset();
    document.getElementById('oldScoreFields').style.display = 'none';
    document.getElementById('newScoreFields').style.display = 'none';
}

// ==========================================
// 학생 상세 모달
// ==========================================
function showStudentDetail(studentId) {
    currentStudent = students.find(s => s.id === studentId);
    
    if (!currentStudent) {
        alert('학생 정보를 찾을 수 없습니다.');
        return;
    }
    
    // 모달 열기
    document.getElementById('studentDetailModal').classList.add('active');
    document.getElementById('detailStudentName').textContent = currentStudent.name;
    
    // 기본 정보 탭 표시
    switchTab('basic-info');
    renderBasicInfo();
}

function closeDetailModal() {
    document.getElementById('studentDetailModal').classList.remove('active');
    currentStudent = null;
}

// ==========================================
// 탭 전환
// ==========================================
function switchTab(tabName) {
    // 탭 버튼 활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // 탭 패널 표시
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    // 탭별 렌더링
    switch(tabName) {
        case 'basic-info':
            renderBasicInfo();
            break;
        case 'scores':
            renderScores();
            break;
        case 'test-results':
            renderTestResults();
            break;
        case 'progress':
            renderProgress();
            break;
        case 'sra':
            renderSra();
            break;
    }
}

// ==========================================
// 기본정보 탭 렌더링
// ==========================================
function renderBasicInfo() {
    if (!currentStudent) return;
    
    document.getElementById('infoName').textContent = currentStudent.name || '-';
    document.getElementById('infoPhone').textContent = currentStudent.phone || '-';
    
    const programText = currentStudent.program_type === 'fast' ? 'Fast (4주)' : 'Standard (8주)';
    document.getElementById('infoProgram').textContent = programText;
    
    document.getElementById('infoChallengeStart').textContent = currentStudent.challenge_start_date || '-';
    document.getElementById('infoChallengeEnd').textContent = currentStudent.challenge_end_date || '-';
    document.getElementById('infoSraAvailable').textContent = currentStudent.sra_available_date || '-';
}

// ==========================================
// 성적관리 탭 렌더링
// ==========================================
function renderScores() {
    if (!currentStudent) return;
    
    const currentScoresDiv = document.getElementById('currentScoresDisplay');
    const targetScoresDiv = document.getElementById('targetScoresDisplay');
    const lastTestDiv = document.getElementById('lastTestDisplay');
    
    // 현재 성적
    if (currentStudent.current_score_type === 'old') {
        currentScoresDiv.innerHTML = `
            <div class="score-item">
                <span class="score-label">Reading</span>
                <span class="score-value">${currentStudent.old_score_reading || 0}점</span>
            </div>
            <div class="score-item">
                <span class="score-label">Listening</span>
                <span class="score-value">${currentStudent.old_score_listening || 0}점</span>
            </div>
            <div class="score-item">
                <span class="score-label">Speaking</span>
                <span class="score-value">${currentStudent.old_score_speaking || 0}점</span>
            </div>
            <div class="score-item">
                <span class="score-label">Writing</span>
                <span class="score-value">${currentStudent.old_score_writing || 0}점</span>
            </div>
            <div class="score-item">
                <span class="score-label"><strong>총점</strong></span>
                <span class="score-value"><strong>${currentStudent.old_score_total || 0}점</strong></span>
            </div>
        `;
    } else if (currentStudent.current_score_type === 'new') {
        currentScoresDiv.innerHTML = `
            <div class="score-item">
                <span class="score-label">Reading</span>
                <span class="score-value">${Number(currentStudent.current_level_reading || 0).toFixed(1)}</span>
            </div>
            <div class="score-item">
                <span class="score-label">Listening</span>
                <span class="score-value">${Number(currentStudent.current_level_listening || 0).toFixed(1)}</span>
            </div>
            <div class="score-item">
                <span class="score-label">Speaking</span>
                <span class="score-value">${Number(currentStudent.current_level_speaking || 0).toFixed(1)}</span>
            </div>
            <div class="score-item">
                <span class="score-label">Writing</span>
                <span class="score-value">${Number(currentStudent.current_level_writing || 0).toFixed(1)}</span>
            </div>
            <div class="score-item">
                <span class="score-label"><strong>총 레벨</strong></span>
                <span class="score-value"><strong>${Number(currentStudent.current_total_level || 0).toFixed(1)}</strong></span>
            </div>
        `;
    } else {
        currentScoresDiv.innerHTML = '<p class="text-muted">현재 성적 정보가 없습니다.</p>';
    }
    
    // 목표 성적
    targetScoresDiv.innerHTML = `
        <div class="score-item">
            <span class="score-label">Reading</span>
            <span class="score-value">${Number(currentStudent.target_level_reading || 0).toFixed(1)}</span>
        </div>
        <div class="score-item">
            <span class="score-label">Listening</span>
            <span class="score-value">${Number(currentStudent.target_level_listening || 0).toFixed(1)}</span>
        </div>
        <div class="score-item">
            <span class="score-label">Speaking</span>
            <span class="score-value">${Number(currentStudent.target_level_speaking || 0).toFixed(1)}</span>
        </div>
        <div class="score-item">
            <span class="score-label">Writing</span>
            <span class="score-value">${Number(currentStudent.target_level_writing || 0).toFixed(1)}</span>
        </div>
        <div class="score-item">
            <span class="score-label"><strong>목표 레벨</strong></span>
            <span class="score-value"><strong>${Number(currentStudent.target_level_total || 0).toFixed(1)}</strong></span>
        </div>
    `;
    
    // 마지막 시험
    lastTestDiv.textContent = currentStudent.last_test_date || '시험 이력 없음';
}

// ==========================================
// 시험결과 탭 렌더링
// ==========================================
function renderTestResults() {
    if (!currentStudent) return;
    
    const studentTests = testResults.filter(t => t.student_id === currentStudent.id)
        .sort((a, b) => a.test_number - b.test_number);
    
    const listDiv = document.getElementById('testResultsList');
    
    if (studentTests.length === 0) {
        listDiv.innerHTML = '<p class="text-muted text-center">등록된 시험 결과가 없습니다.</p>';
        return;
    }
    
    listDiv.innerHTML = studentTests.map(test => `
        <div class="test-result-card">
            <div class="test-result-header">
                <span class="test-result-title">${test.test_number}차 시험</span>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span class="test-result-date">${test.test_date}</span>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="deleteTestResult('${test.id}', ${test.test_number})" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="test-result-scores">
                <div class="test-score">
                    <div class="test-score-label">Reading</div>
                    <div class="test-score-value">${Number(test.level_reading || 0).toFixed(1)}</div>
                </div>
                <div class="test-score">
                    <div class="test-score-label">Listening</div>
                    <div class="test-score-value">${Number(test.level_listening || 0).toFixed(1)}</div>
                </div>
                <div class="test-score">
                    <div class="test-score-label">Speaking</div>
                    <div class="test-score-value">${Number(test.level_speaking || 0).toFixed(1)}</div>
                </div>
                <div class="test-score">
                    <div class="test-score-label">Writing</div>
                    <div class="test-score-value">${Number(test.level_writing || 0).toFixed(1)}</div>
                </div>
                <div class="test-score">
                    <div class="test-score-label"><strong>총점</strong></div>
                    <div class="test-score-value"><strong>${Number(test.level_total || 0).toFixed(1)}</strong></div>
                </div>
            </div>
        </div>
    `).join('');
}

// ==========================================
// 진행현황 탭 렌더링
// ==========================================
function renderProgress() {
    if (!currentStudent) return;
    
    // 신청 단계
    const steps = [
        { id: 'stepContract', completed: currentStudent.contract_completed },
        { id: 'stepDelivery', completed: currentStudent.delivery_completed },
        { id: 'stepAccess', completed: currentStudent.access_completed },
        { id: 'stepNotification', completed: currentStudent.notification_completed }
    ];
    
    steps.forEach(step => {
        const el = document.getElementById(step.id);
        if (step.completed) {
            el.classList.add('completed');
        } else {
            el.classList.remove('completed');
        }
    });
    
    // 결제 정보
    const payment = currentStudent.payment_amount || 0;
    document.getElementById('displayPayment').textContent = payment.toLocaleString() + '원';
    
    // 마무리 체크
    const checkReview = document.getElementById('checkReview');
    const checkSettlement = document.getElementById('checkSettlement');
    
    if (currentStudent.review_submitted) {
        checkReview.classList.add('completed');
    } else {
        checkReview.classList.remove('completed');
    }
    
    if (currentStudent.settlement_completed) {
        checkSettlement.classList.add('completed');
    } else {
        checkSettlement.classList.remove('completed');
    }
}

// ==========================================
// 스라첨삭 탭 렌더링
// ==========================================
function renderSra() {
    if (!currentStudent) return;
    
    const sraDiv = document.getElementById('sraContent');
    
    // 첨삭 신청 여부 확인
    const sraEnabled = currentStudent.sra_enabled !== false && 
                      currentStudent.program_type && 
                      currentStudent.program_type.endsWith('_sra');
    
    if (!sraEnabled) {
        // 첨삭 신청 안 함
        sraDiv.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <i class="fas fa-info-circle" style="font-size: 3rem; color: #999; margin-bottom: 15px;"></i>
                <h4 style="color: var(--text-color); margin-bottom: 10px;">첨삭을 신청하지 않은 학생입니다</h4>
                <p style="color: #999; font-size: 0.9rem;">
                    이 학생은 챌린지만 참여하는 프로그램입니다.
                </p>
            </div>
        `;
        return;
    }
    
    // 시작 가능일
    const availableDate = currentStudent.sra_available_date || '-';
    
    // 현재 배정 확인
    const currentAssignment = assignments.find(a => 
        a.student_id === currentStudent.id && a.status !== '완료'
    );
    
    if (currentAssignment) {
        // 배정된 경우
        const teacher = teachers.find(t => t.id === currentAssignment.teacher_id);
        sraDiv.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <label><i class="fas fa-calendar"></i> 시작 가능일</label>
                    <div>${availableDate}</div>
                </div>
                <div class="info-item">
                    <label><i class="fas fa-user-tie"></i> 담당 선생님</label>
                    <div>${teacher ? teacher.name : '-'}</div>
                </div>
                <div class="info-item">
                    <label><i class="fas fa-calendar-check"></i> 첨삭 시작일</label>
                    <div>${currentAssignment.start_date}</div>
                </div>
                <div class="info-item">
                    <label><i class="fas fa-calendar-times"></i> 첨삭 종료일</label>
                    <div>${currentAssignment.end_date}</div>
                </div>
                <div class="info-item">
                    <label><i class="fas fa-info-circle"></i> 상태</label>
                    <div><span class="badge ${currentAssignment.status === '진행중' ? 'badge-active' : 'badge-success'}">${currentAssignment.status}</span></div>
                </div>
            </div>
            <div class="tab-actions">
                <button class="btn btn-danger" onclick="handleCancelAssignment('${currentAssignment.id}')">
                    <i class="fas fa-times"></i> 배정 취소
                </button>
            </div>
        `;
    } else {
        // 미배정인 경우
        sraDiv.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <label><i class="fas fa-calendar"></i> 시작 가능일</label>
                    <div>${availableDate}</div>
                </div>
                <div class="info-item">
                    <label><i class="fas fa-info-circle"></i> 상태</label>
                    <div><span class="badge badge-waiting">미배정</span></div>
                </div>
            </div>
            <div class="tab-actions">
                <button class="btn btn-primary" onclick="showSlotsForStudent('${currentStudent.id}')">
                    <i class="fas fa-calendar-plus"></i> 배정하기
                </button>
            </div>
        `;
    }
}

// ==========================================
// 스라첨삭 배정 로직
// ==========================================
let selectedSlot = null;

function showSlotsForStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    
    if (!student) {
        alert('학생 정보를 찾을 수 없습니다.');
        return;
    }
    
    // 모달 열기
    document.getElementById('sraSlotModal').classList.add('active');
    
    // 학생 정보 표시
    document.getElementById('slotStudentName').textContent = student.name;
    document.getElementById('slotAvailableDate').textContent = formatDate(student.sra_available_date);
    
    // 슬롯 계산 및 표시
    displayAvailableSlots(student);
}

function closeSraSlotModal() {
    document.getElementById('sraSlotModal').classList.remove('active');
    selectedSlot = null;
}

function displayAvailableSlots(student) {
    const container = document.getElementById('slotsContainer');
    
    // 슬롯 계산
    const slots = calculateAvailableSlotsForStudent(student);
    const futureSlots = calculateFutureSlotInfo(student);
    
    if (slots.length === 0) {
        // 배정 가능한 슬롯이 없는 경우
        let html = `
            <div class="text-center" style="padding: 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: var(--warning-color); margin-bottom: 15px;"></i>
                <h4 style="color: var(--text-color); margin-bottom: 10px;">현재 배정 가능한 슬롯이 없습니다</h4>
                <p class="text-muted">모든 선생님이 최대 인원(4명)을 담당 중입니다.</p>
            </div>
        `;
        
        // 미래 슬롯 정보 추가
        if (futureSlots) {
            html += futureSlots;
        }
        
        container.innerHTML = html;
        return;
    }
    
    // 슬롯 목록 표시
    let html = '<h4 style="margin-bottom: 15px; color: var(--text-color);"><i class="fas fa-calendar-check"></i> 다음 슬롯 중 하나를 선택하세요:</h4>';
    
    html += slots.map((slot, index) => {
        const isWarning = slot.currentCount >= 3;
        const statusBadge = isWarning 
            ? `<span class="badge badge-warning">⚠️ 4명째 배정</span>`
            : `<span class="badge badge-success">여유 있음 (${slot.currentCount}/4)</span>`;
        
        return `
            <div class="slot-card ${isWarning ? 'warning' : ''}" onclick="selectSlot(${index})">
                <div class="slot-header">
                    <div class="slot-teacher">${slot.teacherName} 선생님</div>
                    <div class="slot-status">
                        ${statusBadge}
                    </div>
                </div>
                <div class="slot-body">
                    <div class="slot-info">
                        <div class="slot-label">시작일 (일요일)</div>
                        <div class="slot-value">${formatDate(slot.startDate)}</div>
                    </div>
                    <div class="slot-info">
                        <div class="slot-label">종료일 (수요일)</div>
                        <div class="slot-value">${formatDate(slot.endDate)}</div>
                    </div>
                    <div class="slot-info" style="grid-column: 1 / -1;">
                        <div class="slot-label">정보</div>
                        <div class="slot-value">총 8회 수업 | 현재 ${slot.currentCount}명 담당 중</div>
                    </div>
                    ${isWarning ? `
                        <div class="slot-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>이 슬롯을 배정하면 이 선생님은 동시 4명을 담당하게 됩니다.</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // 미래 슬롯 정보 추가
    if (futureSlots) {
        html += futureSlots;
    }
    
    container.innerHTML = html;
}

function calculateAvailableSlotsForStudent(student) {
    const slots = [];
    const sraStartDate = new Date(student.sra_available_date);
    
    // 각 선생님별로 확인
    for (const teacher of teachers) {
        // 현재 진행 중인 배정 확인
        const activeAssignments = getActiveAssignmentsForTeacher(teacher.id);
        const currentCount = activeAssignments.length;
        
        // 최대 4명까지만 가능
        if (currentCount >= 4) {
            continue;
        }
        
        // 다음 가능한 시작일 찾기 (시작 가능일 이후의 첫 일요일)
        let startDate = new Date(sraStartDate);
        
        // 이미 일요일이면 그대로, 아니면 다음 일요일로
        if (startDate.getDay() !== 0) {
            startDate = getNextDayOfWeek(startDate, 0);
        }
        
        // 기존 배정과 겹치지 않는지 확인하며 시작일 조정
        let attempts = 0;
        while (attempts < 10) { // 최대 10주 확인
            const isConflict = checkDateConflict(teacher.id, startDate);
            if (!isConflict) {
                break;
            }
            // 겹치면 다음 주 일요일로
            startDate.setDate(startDate.getDate() + 7);
            attempts++;
        }
        
        // 종료일 계산 (시작일로부터 4주 후 수요일)
        const endDate = calculateEndDate(startDate);
        
        slots.push({
            teacherId: teacher.id,
            teacherName: teacher.name,
            startDate: formatDateForDB(startDate),
            endDate: formatDateForDB(endDate),
            currentCount: currentCount
        });
    }
    
    // 현재 인원이 적은 순서로 정렬, 같으면 이름순
    slots.sort((a, b) => {
        if (a.currentCount !== b.currentCount) {
            return a.currentCount - b.currentCount;
        }
        return a.teacherName.localeCompare(b.teacherName);
    });
    
    return slots;
}

function getActiveAssignmentsForTeacher(teacherId) {
    return assignments.filter(a => 
        a.teacher_id === teacherId && 
        (a.status === '예정' || a.status === '진행중')
    );
}

function checkDateConflict(teacherId, startDate) {
    const start = new Date(startDate);
    const end = calculateEndDate(start);
    
    const activeAssignments = getActiveAssignmentsForTeacher(teacherId);
    
    for (const assignment of activeAssignments) {
        const assignStart = new Date(assignment.start_date);
        const assignEnd = new Date(assignment.end_date);
        
        // 날짜 겹침 확인
        if (start <= assignEnd && end >= assignStart) {
            return true; // 겹침
        }
    }
    
    return false; // 겹치지 않음
}

function calculateEndDate(startDate) {
    const date = new Date(startDate);
    
    // 4주 후
    date.setDate(date.getDate() + (4 * 7));
    
    // 그 주의 수요일 찾기
    const dayOfWeek = date.getDay();
    const daysUntilWednesday = (3 - dayOfWeek + 7) % 7;
    date.setDate(date.getDate() + daysUntilWednesday);
    
    return date;
}

function calculateFutureSlotInfo(student) {
    const sraStartDate = new Date(student.sra_available_date);
    const futureSlots = [];
    
    for (const teacher of teachers) {
        const activeAssignments = getActiveAssignmentsForTeacher(teacher.id);
        
        // 4명이 아니면 스킵 (이미 배정 가능)
        if (activeAssignments.length < 4) {
            continue;
        }
        
        // 가장 빨리 끝나는 배정 찾기
        const sortedAssignments = activeAssignments.sort((a, b) => 
            new Date(a.end_date) - new Date(b.end_date)
        );
        
        const earliestEnd = sortedAssignments[0];
        const endDate = new Date(earliestEnd.end_date);
        
        // 종료일 다음날부터 가능
        const availableDate = new Date(endDate);
        availableDate.setDate(availableDate.getDate() + 1);
        
        // 다음 일요일 찾기
        if (availableDate.getDay() !== 0) {
            const daysUntilSunday = (7 - availableDate.getDay()) % 7;
            availableDate.setDate(availableDate.getDate() + daysUntilSunday);
        }
        
        // 학생의 시작 가능일 이후인지 확인
        if (availableDate >= sraStartDate) {
            futureSlots.push({
                teacherName: teacher.name,
                availableDate: formatDateForDB(availableDate),
                endingStudent: earliestEnd.student_name
            });
        }
    }
    
    if (futureSlots.length === 0) {
        return '';
    }
    
    // 날짜순 정렬
    futureSlots.sort((a, b) => 
        new Date(a.availableDate) - new Date(b.availableDate)
    );
    
    let html = '<div class="future-slots">';
    html += '<h4><i class="fas fa-clock"></i> 다음 배정 가능 시점</h4>';
    
    html += futureSlots.map(slot => `
        <div class="future-slot-item">
            <div class="future-slot-teacher">${slot.teacherName} 선생님</div>
            <div class="future-slot-date">${formatDate(slot.availableDate)} 부터 자리가 생깁니다</div>
            <div class="future-slot-student">(${slot.endingStudent} 학생 완료 후)</div>
        </div>
    `).join('');
    
    html += '</div>';
    
    return html;
}

function selectSlot(slotIndex) {
    const student = students.find(s => 
        s.name === document.getElementById('slotStudentName').textContent
    );
    
    if (!student) return;
    
    const slots = calculateAvailableSlotsForStudent(student);
    const slot = slots[slotIndex];
    
    if (!slot) return;
    
    selectedSlot = {
        student: student,
        slot: slot
    };
    
    // 확인 모달 열기
    openAssignConfirmModal();
}

function openAssignConfirmModal() {
    if (!selectedSlot) return;
    
    const { student, slot } = selectedSlot;
    
    // 학생 정보
    document.getElementById('confirmStudentName').textContent = student.name;
    document.getElementById('confirmStudentPhone').textContent = student.phone;
    
    const programText = student.program_type === 'fast' ? 'Fast (4주)' : 'Standard (8주)';
    document.getElementById('confirmProgram').textContent = programText;
    
    document.getElementById('confirmChallengePeriod').textContent = 
        `${student.challenge_start_date} ~ ${student.challenge_end_date}`;
    
    document.getElementById('confirmSraAvailable').textContent = formatDate(student.sra_available_date);
    
    // 배정 정보
    document.getElementById('confirmTeacher').textContent = slot.teacherName + ' 선생님';
    document.getElementById('confirmTeacherLoad').textContent = `${slot.currentCount}/4명 담당 중`;
    document.getElementById('confirmStartDate').textContent = formatDate(slot.startDate);
    document.getElementById('confirmEndDate').textContent = formatDate(slot.endDate);
    
    // 경고 메시지
    const warningDiv = document.getElementById('confirmWarning');
    if (slot.currentCount >= 3) {
        warningDiv.style.display = 'flex';
        document.getElementById('confirmWarningText').textContent = 
            `이 배정으로 ${slot.teacherName} 선생님은 동시에 4명의 학생을 담당하게 됩니다.`;
    } else {
        warningDiv.style.display = 'none';
    }
    
    // 슬롯 모달 닫기 (selectedSlot 유지)
    document.getElementById('sraSlotModal').classList.remove('active');
    // 확인 모달 열기
    document.getElementById('assignConfirmModal').classList.add('active');
}

function closeAssignConfirmModal() {
    document.getElementById('assignConfirmModal').classList.remove('active');
    // 여기서 selectedSlot 초기화
    selectedSlot = null;
}

async function handleConfirmAssignment() {
    console.log('handleConfirmAssignment 호출됨, selectedSlot:', selectedSlot);
    
    if (!selectedSlot) {
        alert('선택된 슬롯이 없습니다.');
        return;
    }
    
    const { student, slot } = selectedSlot;
    
    // 버튼 비활성화 (중복 클릭 방지)
    const confirmBtn = document.getElementById('confirmAssignBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
    
    try {
        console.log('배정 데이터 생성 중...');
        // 1. 배정 생성
        const assignmentData = {
            student_id: student.id,
            student_name: student.name,
            teacher_id: slot.teacherId,
            teacher_name: slot.teacherName,
            start_date: slot.startDate,
            end_date: slot.endDate,
            status: '예정',
            session_count: 8
        };
        
        console.log('배정 API 호출:', assignmentData);
        const headers = getSupabaseHeaders();
        
        const assignResponse = await fetch(`${SUPABASE_URL}/rest/v1/assignments`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(assignmentData)
        });
        
        if (!assignResponse.ok) {
            const errorText = await assignResponse.text();
            console.error('배정 생성 실패 응답:', errorText);
            throw new Error('배정 생성 실패');
        }
        
        console.log('배정 생성 성공, 학생 상태 업데이트 중...');
        // 2. 학생 상태 업데이트
        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${student.id}`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify({ slra_status: '배정완료' })
        });
        
        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('학생 상태 업데이트 실패 응답:', errorText);
            throw new Error('학생 상태 업데이트 실패');
        }
        
        console.log('배정 완료 성공!');
        alert(`${student.name} 학생을 ${slot.teacherName} 선생님에게 배정했습니다!`);
        
        closeAssignConfirmModal();
        closeSraSlotModal();
        
        // 데이터 새로고침
        await loadAllData();
        renderStudentsTable();
        updateStats();
        
        // 현재 학생 정보 업데이트
        if (currentStudent && currentStudent.id === student.id) {
            currentStudent = students.find(s => s.id === student.id);
            renderSra();
        }
        
    } catch (error) {
        console.error('배정 오류:', error);
        alert('배정 중 오류가 발생했습니다: ' + error.message);
    } finally {
        // 버튼 활성화
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check"></i> 배정 완료';
    }
}

// ==========================================
// 스라첨삭 배정 취소
// ==========================================
async function handleCancelAssignment(assignmentId) {
    if (!confirm('배정을 취소하시겠습니까?')) {
        return;
    }
    
    try {
        const headers = getSupabaseHeaders();
        const assignment = assignments.find(a => a.id === assignmentId);
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/assignments?id=eq.${assignmentId}`, {
            method: 'DELETE',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error('배정 취소 실패');
        }
        
        // 학생 상태 업데이트
        if (assignment) {
            await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${assignment.student_id}`, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify({ slra_status: '대기' })
            });
        }
        
        alert('배정이 취소되었습니다.');
        
        // 데이터 새로고침
        await loadAllData();
        renderStudentsTable();
        updateStats();
        renderSra();
        
    } catch (error) {
        console.error('배정 취소 오류:', error);
        alert('배정 취소 중 오류가 발생했습니다.');
    }
}

// ==========================================
// 슬롯 조회 모달
// ==========================================
function openViewSlotsModal() {
    try {
        calculateAndDisplaySlotStatus();
        document.getElementById('viewSlotsModal').classList.add('active');
    } catch (error) {
        console.error('openViewSlotsModal 오류:', error);
        alert('슬롯 조회 중 오류가 발생했습니다: ' + error.message);
    }
}

function closeViewSlotsModal() {
    document.getElementById('viewSlotsModal').classList.remove('active');
}

function calculateAndDisplaySlotStatus() {
    const totalSlots = teachers.length * 4;
    const activeAssignments = assignments.filter(a => a.status !== '완료');
    const usedSlots = activeAssignments.length;
    const availableSlots = totalSlots - usedSlots;
    
    // 다음 일요일 계산
    const today = new Date();
    const nextSunday = new Date(today);
    const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    
    // 전체 슬롯 요약
    document.getElementById('viewTotalSlots').textContent = `${totalSlots}개`;
    document.getElementById('viewUsedSlots').textContent = `${usedSlots}개`;
    document.getElementById('viewAvailableSlots').textContent = `${availableSlots}개`;
    document.getElementById('viewNextSunday').textContent = formatDate(formatDateForDB(nextSunday));
    
    // 선생님별 현황
    renderTeacherSlots(activeAssignments);
    
    // 주간 슬롯 현황
    renderWeeklySlots(nextSunday);
}

function renderTeacherSlots(activeAssignments) {
    const container = document.getElementById('teacherSlotsContainer');
    
    let html = '';
    
    for (const teacher of teachers) {
        const teacherAssignments = activeAssignments.filter(a => a.teacher_id === teacher.id);
        const currentCount = teacherAssignments.length;
        const available = 4 - currentCount;
        
        const statusClass = currentCount >= 4 ? 'badge-danger' : currentCount >= 3 ? 'badge-warning' : 'badge-success';
        const statusText = currentCount >= 4 ? '만석' : currentCount >= 3 ? '여유 적음' : '여유 있음';
        
        html += `
            <div style="padding: 15px; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 10px; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="font-weight: 600; font-size: 1.05rem;">
                        <i class="fas fa-user-tie" style="color: var(--primary-color); margin-right: 6px;"></i>
                        ${teacher.name} 선생님
                    </div>
                    <span class="badge ${statusClass}">${statusText}</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.9rem;">
                    <div>
                        <span style="color: #999;">현재 담당:</span>
                        <strong style="color: var(--primary-color); margin-left: 5px;">${currentCount}명</strong>
                    </div>
                    <div>
                        <span style="color: #999;">배정 가능:</span>
                        <strong style="color: var(--success-color); margin-left: 5px;">${available}명</strong>
                    </div>
                    <div>
                        <span style="color: #999;">최대:</span>
                        <strong style="margin-left: 5px;">4명</strong>
                    </div>
                </div>
                ${teacherAssignments.length > 0 ? `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                        <div style="font-size: 0.85rem; color: #999; margin-bottom: 5px;">현재 담당 학생:</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                            ${teacherAssignments.map(a => `
                                <span style="background: var(--light-gray); padding: 3px 8px; border-radius: 4px; font-size: 0.85rem;">
                                    ${a.student_name} (${formatDate(a.end_date)}까지)
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function renderWeeklySlots(startDate) {
    const container = document.getElementById('weeklySlotsContainer');
    
    let html = '<div style="display: grid; gap: 10px;">';
    
    // 향후 4주간 슬롯 계산
    for (let week = 0; week < 4; week++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + (week * 7));
        
        const weekEnd = calculateEndDate(weekStart);
        
        // 이 주에 배정 가능한 슬롯 수 계산
        let availableCount = 0;
        for (const teacher of teachers) {
            const activeAssignments = getActiveAssignmentsForTeacher(teacher.id);
            if (activeAssignments.length < 4) {
                // 날짜 겹침 확인
                const hasConflict = checkDateConflict(teacher.id, weekStart);
                if (!hasConflict) {
                    availableCount++;
                }
            }
        }
        
        const statusClass = availableCount === 0 ? 'badge-danger' : availableCount <= 1 ? 'badge-warning' : 'badge-success';
        const statusText = availableCount === 0 ? '배정 불가' : availableCount === 1 ? '여유 적음' : '배정 가능';
        
        html += `
            <div style="padding: 12px 15px; border: 1px solid var(--border-color); border-radius: 6px; background: white; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; color: var(--text-color); margin-bottom: 3px;">
                        ${week === 0 ? '이번 주' : week === 1 ? '다음 주' : `${week + 1}주 후`}
                    </div>
                    <div style="font-size: 0.85rem; color: #999;">
                        ${formatDate(formatDateForDB(weekStart))} ~ ${formatDate(formatDateForDB(weekEnd))}
                    </div>
                </div>
                <div style="text-align: right;">
                    <span class="badge ${statusClass}">${statusText}</span>
                    <div style="font-size: 0.85rem; color: #999; margin-top: 3px;">
                        ${availableCount}개 슬롯
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    
    container.innerHTML = html;
}

// ==========================================
// 학생 삭제
// ==========================================
async function handleDeleteStudent() {
    if (!currentStudent) return;
    
    const confirmMsg = `정말로 "${currentStudent.name}" 학생을 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다!\n- 학생의 모든 정보가 삭제됩니다.\n- 관련된 시험 결과가 모두 삭제됩니다.\n- 배정 정보가 삭제됩니다.`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    // 한 번 더 확인
    const finalConfirm = prompt(`삭제를 진행하려면 학생 이름 "${currentStudent.name}"을(를) 정확히 입력하세요:`);
    
    if (finalConfirm !== currentStudent.name) {
        alert('학생 이름이 일치하지 않습니다. 삭제가 취소되었습니다.');
        return;
    }
    
    try {
        const studentId = currentStudent.id;
        const studentName = currentStudent.name;
        const headers = getSupabaseHeaders();
        
        // Supabase는 CASCADE 삭제를 지원하므로 학생만 삭제하면 관련 데이터도 자동 삭제됩니다
        const response = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${studentId}`, {
            method: 'DELETE',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error('학생 삭제 실패');
        }
        
        alert(`"${studentName}" 학생이 성공적으로 삭제되었습니다.`);
        
        // 모달 닫기
        closeDetailModal();
        
        // 데이터 새로고침
        await loadAllData();
        renderStudentsTable();
        updateStats();
        
    } catch (error) {
        console.error('학생 삭제 오류:', error);
        alert('학생 삭제 중 오류가 발생했습니다: ' + error.message);
    }
}

// ==========================================
// 엑셀 다운로드 기능
// ==========================================
function exportToExcel() {
    try {
        // 현재 날짜와 시간
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(now.getHours()).padStart(2, '0')}시${String(now.getMinutes()).padStart(2, '0')}분`;
        const fileName = `학생관리_전체백업_${dateStr}_${timeStr}.xlsx`;
        
        // 엑셀 데이터 준비
        const excelData = [];
        
        // 헤더 행
        const headers = [
            '학생이름', '연락처', '프로그램', '챌린지시작일', '챌린지종료일', '스라시작가능일',
            '현재성적타입', 'Reading(현재)', 'Listening(현재)', 'Speaking(현재)', 'Writing(현재)', '총점/총레벨(현재)',
            'Reading(목표)', 'Listening(목표)', 'Speaking(목표)', 'Writing(목표)', '총점/총레벨(목표)',
            '마지막시험일',
            '1차시험일', '1차Reading', '1차Listening', '1차Speaking', '1차Writing', '1차총레벨',
            '2차시험일', '2차Reading', '2차Listening', '2차Speaking', '2차Writing', '2차총레벨',
            '3차시험일', '3차Reading', '3차Listening', '3차Speaking', '3차Writing', '3차총레벨',
            '4차시험일', '4차Reading', '4차Listening', '4차Speaking', '4차Writing', '4차총레벨',
            '5차시험일', '5차Reading', '5차Listening', '5차Speaking', '5차Writing', '5차총레벨',
            '6차시험일', '6차Reading', '6차Listening', '6차Speaking', '6차Writing', '6차총레벨',
            '스라배정상태', '담당선생님', '스라시작일', '스라종료일',
            '계약서완료', '택배완료', '액세스완료', '알림톡완료', '리뷰제출', '정산완료',
            '입금액', '메모'
        ];
        excelData.push(headers);
        
        // 각 학생 데이터
        for (const student of students) {
            const row = [];
            
            // 기본 정보
            row.push(student.name || '');
            row.push(student.phone || '');
            
            // 프로그램
            let programText = '';
            if (student.program_type === 'fast_only') programText = 'Fast(4주) - 챌린지만';
            else if (student.program_type === 'fast_sra') programText = 'Fast(4주) + 첨삭';
            else if (student.program_type === 'standard_only') programText = 'Standard(8주) - 챌린지만';
            else if (student.program_type === 'standard_sra') programText = 'Standard(8주) + 첨삭';
            else if (student.program_type === 'fast') programText = 'Fast(4주)';
            else programText = 'Standard(8주)';
            row.push(programText);
            
            row.push(student.challenge_start_date || '');
            row.push(student.challenge_end_date || '');
            row.push(student.sra_available_date || '');
            
            // 현재 성적
            const currentType = student.current_score_type === 'old' ? '개정전(0-120점)' : '개정후(1-6레벨)';
            row.push(currentType);
            
            if (student.current_score_type === 'old') {
                row.push(student.old_score_reading || 0);
                row.push(student.old_score_listening || 0);
                row.push(student.old_score_speaking || 0);
                row.push(student.old_score_writing || 0);
                row.push(student.old_score_total || 0);
            } else {
                row.push(student.current_level_reading ? student.current_level_reading.toFixed(1) : '');
                row.push(student.current_level_listening ? student.current_level_listening.toFixed(1) : '');
                row.push(student.current_level_speaking ? student.current_level_speaking.toFixed(1) : '');
                row.push(student.current_level_writing ? student.current_level_writing.toFixed(1) : '');
                row.push(student.current_total_level ? student.current_total_level.toFixed(1) : '');
            }
            
            // 목표 성적
            row.push(student.target_level_reading ? student.target_level_reading.toFixed(1) : '');
            row.push(student.target_level_listening ? student.target_level_listening.toFixed(1) : '');
            row.push(student.target_level_speaking ? student.target_level_speaking.toFixed(1) : '');
            row.push(student.target_level_writing ? student.target_level_writing.toFixed(1) : '');
            row.push(student.target_level_total ? student.target_level_total.toFixed(1) : '');
            
            // 마지막 시험일
            row.push(student.last_test_date || '');
            
            // 시험 결과 (1-6차)
            const studentTests = testResults.filter(t => t.student_id === student.id).sort((a, b) => a.test_number - b.test_number);
            for (let i = 1; i <= 6; i++) {
                const test = studentTests.find(t => t.test_number === i);
                if (test) {
                    row.push(test.test_date || '');
                    row.push(test.level_reading ? test.level_reading.toFixed(1) : '');
                    row.push(test.level_listening ? test.level_listening.toFixed(1) : '');
                    row.push(test.level_speaking ? test.level_speaking.toFixed(1) : '');
                    row.push(test.level_writing ? test.level_writing.toFixed(1) : '');
                    row.push(test.level_total ? test.level_total.toFixed(1) : '');
                } else {
                    row.push('', '', '', '', '', ''); // 6개 빈 셀
                }
            }
            
            // 스라첨삭 배정
            const assignment = assignments.find(a => a.student_id === student.id && a.status !== '완료');
            if (assignment) {
                row.push(assignment.status === '진행중' ? '진행중' : '배정완료');
                const teacher = teachers.find(t => t.id === assignment.teacher_id);
                row.push(teacher ? teacher.name : '');
                row.push(assignment.start_date || '');
                row.push(assignment.end_date || '');
            } else {
                if (student.sra_enabled === false) {
                    row.push('-', '', '', '');
                } else {
                    row.push('미배정', '', '', '');
                }
            }
            
            // 진행 현황
            row.push(student.contract_completed ? 'O' : 'X');
            row.push(student.delivery_completed ? 'O' : 'X');
            row.push(student.access_completed ? 'O' : 'X');
            row.push(student.notification_completed ? 'O' : 'X');
            row.push(student.review_submitted ? 'O' : 'X');
            row.push(student.settlement_completed ? 'O' : 'X');
            
            // 입금액
            row.push(student.payment_amount ? student.payment_amount.toLocaleString() : '');
            
            // 메모
            row.push(student.memo || '');
            
            excelData.push(row);
        }
        
        // 엑셀 파일 생성
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        // 컬럼 너비 설정
        const colWidths = [
            { wch: 10 },  // 학생이름
            { wch: 15 },  // 연락처
            { wch: 20 },  // 프로그램
            { wch: 12 },  // 챌린지시작일
            { wch: 12 },  // 챌린지종료일
            { wch: 15 },  // 스라시작가능일
            { wch: 15 },  // 현재성적타입
            { wch: 12 },  // Reading(현재)
            { wch: 12 },  // Listening(현재)
            { wch: 12 },  // Speaking(현재)
            { wch: 12 },  // Writing(현재)
            { wch: 15 },  // 총점/총레벨(현재)
            { wch: 12 },  // Reading(목표)
            { wch: 12 },  // Listening(목표)
            { wch: 12 },  // Speaking(목표)
            { wch: 12 },  // Writing(목표)
            { wch: 15 },  // 총점/총레벨(목표)
            { wch: 12 },  // 마지막시험일
        ];
        
        // 1-6차 시험 결과 컬럼 (각 6개씩)
        for (let i = 0; i < 6; i++) {
            colWidths.push({ wch: 12 }); // 시험일
            colWidths.push({ wch: 10 }); // Reading
            colWidths.push({ wch: 10 }); // Listening
            colWidths.push({ wch: 10 }); // Speaking
            colWidths.push({ wch: 10 }); // Writing
            colWidths.push({ wch: 10 }); // 총레벨
        }
        
        // 나머지 컬럼
        colWidths.push({ wch: 12 }); // 스라배정상태
        colWidths.push({ wch: 10 }); // 담당선생님
        colWidths.push({ wch: 12 }); // 스라시작일
        colWidths.push({ wch: 12 }); // 스라종료일
        colWidths.push({ wch: 10 }); // 계약서완료
        colWidths.push({ wch: 10 }); // 택배완료
        colWidths.push({ wch: 10 }); // 액세스완료
        colWidths.push({ wch: 10 }); // 알림톡완료
        colWidths.push({ wch: 10 }); // 리뷰제출
        colWidths.push({ wch: 10 }); // 정산완료
        colWidths.push({ wch: 12 }); // 입금액
        colWidths.push({ wch: 30 }); // 메모
        
        ws['!cols'] = colWidths;
        
        // 시트 추가
        XLSX.utils.book_append_sheet(wb, ws, '전체 학생 데이터');
        
        // 파일 다운로드
        XLSX.writeFile(wb, fileName);
        
        alert(`✅ 백업 완료!\n파일명: ${fileName}\n\n총 ${students.length}명의 학생 데이터가 다운로드되었습니다.`);
        
    } catch (error) {
        console.error('엑셀 다운로드 오류:', error);
        alert('엑셀 다운로드 중 오류가 발생했습니다: ' + error.message);
    }
}

// ==========================================
// 유틸리티 함수
// ==========================================
function formatDateForDB(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = days[date.getDay()];
    return `${dateStr} (${dayName})`;
}

function getNextDayOfWeek(date, targetDay) {
    const result = new Date(date);
    const currentDay = result.getDay();
    const distance = (targetDay + 7 - currentDay) % 7 || 7;
    result.setDate(result.getDate() + distance);
    return result;
}

// ==========================================
// 기본정보 수정 기능
// ==========================================
function openEditBasicInfoModal() {
    if (!currentStudent) return;
    
    document.getElementById('editName').value = currentStudent.name || '';
    document.getElementById('editPhone').value = currentStudent.phone || '';
    document.getElementById('editProgram').value = currentStudent.program_type || 'fast';
    document.getElementById('editStartDate').value = currentStudent.challenge_start_date || '';
    
    document.getElementById('editBasicInfoModal').classList.add('active');
}

function closeEditBasicInfoModal() {
    document.getElementById('editBasicInfoModal').classList.remove('active');
}

async function handleEditBasicInfo(e) {
    e.preventDefault();
    
    if (!currentStudent) return;
    
    const name = document.getElementById('editName').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const programType = document.getElementById('editProgram').value;
    const startDate = document.getElementById('editStartDate').value;
    
    if (!name || !phone || !programType || !startDate) {
        alert('필수 항목을 모두 입력해주세요.');
        return;
    }
    
    // 챌린지 종료일 재계산
    const challengeStart = new Date(startDate);
    const challengeEnd = new Date(challengeStart);
    const weeksToAdd = programType === 'fast' ? 4 : 8;
    challengeEnd.setDate(challengeStart.getDate() + (weeksToAdd * 7) - 1);
    
    // 스라첨삭 시작 가능일 재계산
    const sraStart = new Date(challengeEnd);
    sraStart.setDate(sraStart.getDate() + 1);
    const dayOfWeek = sraStart.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    sraStart.setDate(sraStart.getDate() + daysUntilSunday);
    
    const updateData = {
        name,
        phone,
        program_type: programType,
        challenge_start_date: formatDateForDB(challengeStart),
        challenge_end_date: formatDateForDB(challengeEnd),
        sra_available_date: formatDateForDB(sraStart)
    };
    
    try {
        const headers = getSupabaseHeaders();
        const response = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${currentStudent.id}`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error('기본정보 수정 실패');
        }
        
        alert('기본 정보가 수정되었습니다!');
        closeEditBasicInfoModal();
        
        // 데이터 새로고침
        await loadAllData();
        renderStudentsTable();
        updateStats();
        
        // 현재 학생 정보 업데이트
        currentStudent = students.find(s => s.id === currentStudent.id);
        renderBasicInfo();
        
    } catch (error) {
        console.error('기본정보 수정 오류:', error);
        alert('기본 정보 수정 중 오류가 발생했습니다.');
    }
}

// ==========================================
// 성적 수정 기능
// ==========================================
function openEditScoresModal() {
    if (!currentStudent) return;
    
    const scoreType = currentStudent.current_score_type || 'new';
    document.getElementById('editScoreType').value = scoreType;
    
    // 필드 표시/숨김
    const oldFields = document.getElementById('editOldScoreFields');
    const newFields = document.getElementById('editNewScoreFields');
    
    if (scoreType === 'old') {
        oldFields.style.display = 'block';
        newFields.style.display = 'none';
        
        document.getElementById('editOldReading').value = currentStudent.old_score_reading || 0;
        document.getElementById('editOldListening').value = currentStudent.old_score_listening || 0;
        document.getElementById('editOldSpeaking').value = currentStudent.old_score_speaking || 0;
        document.getElementById('editOldWriting').value = currentStudent.old_score_writing || 0;
    } else {
        oldFields.style.display = 'none';
        newFields.style.display = 'block';
        
        document.getElementById('editNewReading').value = currentStudent.current_level_reading || 0;
        document.getElementById('editNewListening').value = currentStudent.current_level_listening || 0;
        document.getElementById('editNewSpeaking').value = currentStudent.current_level_speaking || 0;
        document.getElementById('editNewWriting').value = currentStudent.current_level_writing || 0;
    }
    
    // 목표 성적
    document.getElementById('editTargetReading').value = currentStudent.target_level_reading || 0;
    document.getElementById('editTargetListening').value = currentStudent.target_level_listening || 0;
    document.getElementById('editTargetSpeaking').value = currentStudent.target_level_speaking || 0;
    document.getElementById('editTargetWriting').value = currentStudent.target_level_writing || 0;
    
    // 마지막 시험 날짜
    document.getElementById('editLastTestDate').value = currentStudent.last_test_date || '';
    
    document.getElementById('editScoresModal').classList.add('active');
}

function closeEditScoresModal() {
    document.getElementById('editScoresModal').classList.remove('active');
}

async function handleEditScores(e) {
    e.preventDefault();
    
    if (!currentStudent) return;
    
    const scoreType = document.getElementById('editScoreType').value;
    
    const updateData = {
        current_score_type: scoreType
    };
    
    // 현재 성적
    if (scoreType === 'old') {
        updateData.old_score_reading = parseFloat(document.getElementById('editOldReading').value) || 0;
        updateData.old_score_listening = parseFloat(document.getElementById('editOldListening').value) || 0;
        updateData.old_score_speaking = parseFloat(document.getElementById('editOldSpeaking').value) || 0;
        updateData.old_score_writing = parseFloat(document.getElementById('editOldWriting').value) || 0;
        updateData.old_score_total = updateData.old_score_reading + updateData.old_score_listening + 
                                       updateData.old_score_speaking + updateData.old_score_writing;
        
        // 개정후 성적 초기화
        updateData.current_level_reading = 0;
        updateData.current_level_listening = 0;
        updateData.current_level_speaking = 0;
        updateData.current_level_writing = 0;
        updateData.current_total_level = 0;
    } else {
        updateData.current_level_reading = parseFloat(document.getElementById('editNewReading').value) || 0;
        updateData.current_level_listening = parseFloat(document.getElementById('editNewListening').value) || 0;
        updateData.current_level_speaking = parseFloat(document.getElementById('editNewSpeaking').value) || 0;
        updateData.current_level_writing = parseFloat(document.getElementById('editNewWriting').value) || 0;
        
        const avg = (updateData.current_level_reading + updateData.current_level_listening + 
                     updateData.current_level_speaking + updateData.current_level_writing) / 4;
        updateData.current_total_level = Math.round(avg * 2) / 2;
        
        // 개정전 성적 초기화
        updateData.old_score_reading = 0;
        updateData.old_score_listening = 0;
        updateData.old_score_speaking = 0;
        updateData.old_score_writing = 0;
        updateData.old_score_total = 0;
    }
    
    // 목표 성적
    updateData.target_level_reading = parseFloat(document.getElementById('editTargetReading').value) || 0;
    updateData.target_level_listening = parseFloat(document.getElementById('editTargetListening').value) || 0;
    updateData.target_level_speaking = parseFloat(document.getElementById('editTargetSpeaking').value) || 0;
    updateData.target_level_writing = parseFloat(document.getElementById('editTargetWriting').value) || 0;
    
    const targetAvg = (updateData.target_level_reading + updateData.target_level_listening + 
                       updateData.target_level_speaking + updateData.target_level_writing) / 4;
    updateData.target_level_total = Math.round(targetAvg * 2) / 2;
    
    // 마지막 시험 날짜
    const lastTestDate = document.getElementById('editLastTestDate').value;
    if (lastTestDate) {
        updateData.last_test_date = lastTestDate;
    }
    
    try {
        const headers = getSupabaseHeaders();
        const response = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${currentStudent.id}`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error('성적 수정 실패');
        }
        
        alert('성적 정보가 수정되었습니다!');
        closeEditScoresModal();
        
        // 데이터 새로고침
        await loadAllData();
        renderStudentsTable();
        updateStats();
        
        // 현재 학생 정보 업데이트
        currentStudent = students.find(s => s.id === currentStudent.id);
        renderScores();
        
    } catch (error) {
        console.error('성적 수정 오류:', error);
        alert('성적 정보 수정 중 오류가 발생했습니다.');
    }
}

// ==========================================
// 진행현황 수정 기능
// ==========================================
function openEditProgressModal() {
    if (!currentStudent) return;
    
    document.getElementById('editContract').checked = currentStudent.contract_completed || false;
    document.getElementById('editDelivery').checked = currentStudent.delivery_completed || false;
    document.getElementById('editAccess').checked = currentStudent.access_completed || false;
    document.getElementById('editNotification').checked = currentStudent.notification_completed || false;
    
    document.getElementById('editPayment').value = currentStudent.payment_amount || 0;
    
    document.getElementById('editReview').checked = currentStudent.review_submitted || false;
    document.getElementById('editSettlement').checked = currentStudent.settlement_completed || false;
    
    document.getElementById('editProgressModal').classList.add('active');
}

function closeEditProgressModal() {
    document.getElementById('editProgressModal').classList.remove('active');
}

async function handleEditProgress(e) {
    e.preventDefault();
    
    if (!currentStudent) return;
    
    const updateData = {
        contract_completed: document.getElementById('editContract').checked,
        delivery_completed: document.getElementById('editDelivery').checked,
        access_completed: document.getElementById('editAccess').checked,
        notification_completed: document.getElementById('editNotification').checked,
        payment_amount: parseFloat(document.getElementById('editPayment').value) || 0,
        review_submitted: document.getElementById('editReview').checked,
        settlement_completed: document.getElementById('editSettlement').checked
    };
    
    try {
        const headers = getSupabaseHeaders();
        const response = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${currentStudent.id}`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error('진행현황 수정 실패');
        }
        
        alert('진행 현황이 수정되었습니다!');
        closeEditProgressModal();
        
        // 데이터 새로고침
        await loadAllData();
        renderStudentsTable();
        updateStats();
        
        // 현재 학생 정보 업데이트
        currentStudent = students.find(s => s.id === currentStudent.id);
        renderProgress();
        
    } catch (error) {
        console.error('진행현황 수정 오류:', error);
        alert('진행 현황 수정 중 오류가 발생했습니다.');
    }
}

// ==========================================
// 시험 결과 추가 기능
// ==========================================
function openAddTestResultModal() {
    if (!currentStudent) return;
    
    document.getElementById('addTestResultModal').classList.add('active');
}

function closeAddTestResultModal() {
    document.getElementById('addTestResultModal').classList.remove('active');
    document.getElementById('addTestResultForm').reset();
}

async function handleAddTestResult(e) {
    e.preventDefault();
    
    if (!currentStudent) return;
    
    const testNumber = parseInt(document.getElementById('testNumber').value);
    const testDate = document.getElementById('testDate').value;
    const reading = parseFloat(document.getElementById('testReading').value);
    const listening = parseFloat(document.getElementById('testListening').value);
    const speaking = parseFloat(document.getElementById('testSpeaking').value);
    const writing = parseFloat(document.getElementById('testWriting').value);
    
    if (!testNumber || !testDate || !reading || !listening || !speaking || !writing) {
        alert('모든 항목을 입력해주세요.');
        return;
    }
    
    // 이미 해당 회차가 있는지 확인
    const existingTest = testResults.find(t => 
        t.student_id === currentStudent.id && t.test_number === testNumber
    );
    
    if (existingTest) {
        alert(`${testNumber}차 시험 결과가 이미 등록되어 있습니다.`);
        return;
    }
    
    // 총 레벨 계산
    const avg = (reading + listening + speaking + writing) / 4;
    const total = Math.round(avg * 2) / 2;
    
    const testData = {
        student_id: currentStudent.id,
        test_number: testNumber,
        test_date: testDate,
        reading_level: reading,
        listening_level: listening,
        speaking_level: speaking,
        writing_level: writing,
        total_level: total
    };
    
    try {
        const headers = getSupabaseHeaders();
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/test_results`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(testData)
        });
        
        if (!response.ok) {
            throw new Error('시험 결과 추가 실패');
        }
        
        alert(`${testNumber}차 시험 결과가 추가되었습니다!`);
        closeAddTestResultModal();
        
        // 데이터 새로고침
        await loadAllData();
        renderTestResults();
        
    } catch (error) {
        console.error('시험 결과 추가 오류:', error);
        alert('시험 결과 추가 중 오류가 발생했습니다.');
    }
}

// ==========================================
// 시험 결과 삭제 기능
// ==========================================
async function deleteTestResult(testResultId, testNumber) {
    if (!confirm(`${testNumber}차 시험 결과를 삭제하시겠습니까?`)) {
        return;
    }
    
    try {
        const response = await fetch(`tables/test_results/${testResultId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('시험 결과 삭제 실패');
        }
        
        alert(`${testNumber}차 시험 결과가 삭제되었습니다.`);
        
        // 데이터 새로고침
        await loadAllData();
        renderTestResults();
        
    } catch (error) {
        console.error('시험 결과 삭제 오류:', error);
        alert('시험 결과 삭제 중 오류가 발생했습니다.');
    }
}

