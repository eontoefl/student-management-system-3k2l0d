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
        
        // 현재 점수 입력 체크박스
        const enableCurrentScore = document.getElementById('enableCurrentScore');
        const currentScoreInputs = document.getElementById('currentScoreInputs');
        const scoreTypeSelect = document.getElementById('newStudentScoreType');
        
        if (enableCurrentScore) {
            enableCurrentScore.addEventListener('change', (e) => {
                if (e.target.checked) {
                    currentScoreInputs.style.display = 'block';
                    currentScoreInputs.classList.add('active');
                } else {
                    currentScoreInputs.style.display = 'none';
                    currentScoreInputs.classList.remove('active');
                    // 체크 해제 시 초기화
                    scoreTypeSelect.value = '';
                    document.getElementById('oldScoreFields').style.display = 'none';
                    document.getElementById('newScoreFields').style.display = 'none';
                    document.getElementById('oldTotal').required = false;
                    document.getElementById('newTotal').required = false;
                }
            });
        }
        
        // 성적 타입 선택 시 해당 필드 표시
        scoreTypeSelect.addEventListener('change', (e) => {
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
        
        // 목표 점수 - 섹션별 커트라인 펼치기/접기
        const enableSectionCutoff = document.getElementById('enableSectionCutoff');
        const sectionCutoffInputs = document.getElementById('sectionCutoffInputs');
        if (enableSectionCutoff) {
            enableSectionCutoff.addEventListener('change', (e) => {
                if (e.target.checked) {
                    sectionCutoffInputs.style.display = 'block';
                    sectionCutoffInputs.classList.add('active');
                } else {
                    sectionCutoffInputs.style.display = 'none';
                    sectionCutoffInputs.classList.remove('active');
                    // 체크 해제 시 값 초기화
                    document.getElementById('targetCutoffReading').value = '';
                    document.getElementById('targetCutoffListening').value = '';
                    document.getElementById('targetCutoffSpeaking').value = '';
                    document.getElementById('targetCutoffWriting').value = '';
                }
            });
        }
        
        // 목표 점수 - 개인 희망 점수 펼치기/접기
        const enablePersonalTarget = document.getElementById('enablePersonalTarget');
        const personalTargetInputs = document.getElementById('personalTargetInputs');
        if (enablePersonalTarget) {
            enablePersonalTarget.addEventListener('change', (e) => {
                if (e.target.checked) {
                    personalTargetInputs.style.display = 'block';
                    personalTargetInputs.classList.add('active');
                } else {
                    personalTargetInputs.style.display = 'none';
                    personalTargetInputs.classList.remove('active');
                    // 체크 해제 시 값 초기화
                    document.getElementById('targetPersonalTotal').value = '';
                    document.getElementById('targetPersonalReading').value = '';
                    document.getElementById('targetPersonalListening').value = '';
                    document.getElementById('targetPersonalSpeaking').value = '';
                    document.getElementById('targetPersonalWriting').value = '';
                }
            });
        }
        
        // 목표 점수 - 개인 희망 입력 방식 전환
        const personalTargetMode = document.getElementById('personalTargetMode');
        const personalTotalInput = document.getElementById('personalTotalInput');
        const personalSectionsInput = document.getElementById('personalSectionsInput');
        if (personalTargetMode) {
            personalTargetMode.addEventListener('change', (e) => {
                if (e.target.value === 'total') {
                    personalTotalInput.style.display = 'block';
                    personalSectionsInput.style.display = 'none';
                } else {
                    personalTotalInput.style.display = 'none';
                    personalSectionsInput.style.display = 'block';
                }
            });
        }
        
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
        
        // 성적 수정 - 현재 점수 체크박스
        const editEnableCurrentScore = document.getElementById('editEnableCurrentScore');
        const editCurrentScoreInputs = document.getElementById('editCurrentScoreInputs');
        const editScoreTypeSelect = document.getElementById('editScoreType');
        
        if (editEnableCurrentScore) {
            editEnableCurrentScore.addEventListener('change', (e) => {
                if (e.target.checked) {
                    editCurrentScoreInputs.style.display = 'block';
                    editCurrentScoreInputs.classList.add('active');
                } else {
                    editCurrentScoreInputs.style.display = 'none';
                    editCurrentScoreInputs.classList.remove('active');
                    editScoreTypeSelect.value = '';
                    document.getElementById('editOldScoreFields').style.display = 'none';
                    document.getElementById('editNewScoreFields').style.display = 'none';
                }
            });
        }
        
        // 성적 수정 모달의 성적 타입 선택
        editScoreTypeSelect.addEventListener('change', (e) => {
            const oldFields = document.getElementById('editOldScoreFields');
            const newFields = document.getElementById('editNewScoreFields');
            
            if (e.target.value === 'old') {
                oldFields.style.display = 'block';
                newFields.style.display = 'none';
            } else if (e.target.value === 'new') {
                oldFields.style.display = 'none';
                newFields.style.display = 'block';
            } else {
                oldFields.style.display = 'none';
                newFields.style.display = 'none';
            }
        });
        
        // 성적 수정 - 섹션별 커트라인
        const editEnableSectionCutoff = document.getElementById('editEnableSectionCutoff');
        const editSectionCutoffInputs = document.getElementById('editSectionCutoffInputs');
        if (editEnableSectionCutoff) {
            editEnableSectionCutoff.addEventListener('change', (e) => {
                if (e.target.checked) {
                    editSectionCutoffInputs.style.display = 'block';
                    editSectionCutoffInputs.classList.add('active');
                } else {
                    editSectionCutoffInputs.style.display = 'none';
                    editSectionCutoffInputs.classList.remove('active');
                }
            });
        }
        
        // 성적 수정 - 개인 희망 점수
        const editEnablePersonalTarget = document.getElementById('editEnablePersonalTarget');
        const editPersonalTargetInputs = document.getElementById('editPersonalTargetInputs');
        if (editEnablePersonalTarget) {
            editEnablePersonalTarget.addEventListener('change', (e) => {
                if (e.target.checked) {
                    editPersonalTargetInputs.style.display = 'block';
                    editPersonalTargetInputs.classList.add('active');
                } else {
                    editPersonalTargetInputs.style.display = 'none';
                    editPersonalTargetInputs.classList.remove('active');
                }
            });
        }
        
        // 성적 수정 - 개인 희망 입력 방식
        const editPersonalTargetMode = document.getElementById('editPersonalTargetMode');
        const editPersonalTotalInput = document.getElementById('editPersonalTotalInput');
        const editPersonalSectionsInput = document.getElementById('editPersonalSectionsInput');
        if (editPersonalTargetMode) {
            editPersonalTargetMode.addEventListener('change', (e) => {
                if (e.target.value === 'total') {
                    editPersonalTotalInput.style.display = 'block';
                    editPersonalSectionsInput.style.display = 'none';
                } else {
                    editPersonalTotalInput.style.display = 'none';
                    editPersonalSectionsInput.style.display = 'block';
                }
            });
        }
        
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
    const completed = students.filter(s => s.slra_status === '완료').length;
    
    // 첨삭 대기중 (첨삭 신청했지만 미배정)
    const waiting = students.filter(s => {
        const sraEnabled = s.program_type && s.program_type.endsWith('_sra');
        return sraEnabled && s.slra_status === '대기';
    }).length;
    
    // 첨삭 배정완료
    const assigned = students.filter(s => s.slra_status === '배정완료').length;
    
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
                <td colspan="9">
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
        const timeline = calculateTimeline(student);
        const currentScore = getScoreDisplay(student, 'current');
        const targetScore = getScoreDisplay(student, 'target');
        
        // 프로그램 표시
        let programBadge = '';
        if (student.program_type?.includes('fast')) {
            programBadge = '<span class="badge badge-fast">Fast 4주</span>';
        } else if (student.program_type?.includes('standard')) {
            programBadge = '<span class="badge badge-standard">Standard 8주</span>';
        } else {
            programBadge = '-';
        }
        
        // 기간 표시
        const period = timeline && timeline.challengeStart
            ? `${formatDateShort(timeline.challengeStart)} ~ ${formatDateShort(timeline.sraEnd || timeline.challengeEnd)}`
            : '-';
        
        // 첨삭 상태
        let sraStatus = '-';
        let sraStatusClass = '';
        const sraEnabled = student.program_type && student.program_type.endsWith('_sra');
        
        if (sraEnabled) {
            const sraAssignment = assignments.find(a => a.student_id === student.id && a.status !== '완료');
            if (sraAssignment) {
                sraStatus = sraAssignment.teacher_name || '배정완료';
                sraStatusClass = 'badge-success';
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
        
        // 준비 단계 (잔디심기)
        const preparationHTML = renderPreparationSteps(student);
        
        // D-Day
        const dDay = timeline?.dDayLabel || '-';
        
        // 미니 프로그레스 바
        let progressHTML = '-';
        if (timeline && timeline.challengeStart) {
            const challengeClass = timeline.programType === 'fast' ? 'segment-mini-challenge-fast' : 'segment-mini-challenge-standard';
            const challengeStatusClass = timeline.challengeStatus === 'completed' ? 'segment-mini-completed' : 
                                         timeline.challengeStatus === 'upcoming' ? 'segment-mini-upcoming' : '';
            const sraStatusClass = timeline.sraStatus === 'completed' ? 'segment-mini-completed' : 
                                   timeline.sraStatus === 'upcoming' ? 'segment-mini-upcoming' : '';
            
            progressHTML = `
                <div class="progress-mini">
                    <div class="progress-mini-segments">
                        <div class="progress-mini-segment ${challengeClass} ${challengeStatusClass}" 
                             style="width: ${timeline.challengeWidth}%;">
                        </div>
                        ${timeline.sraStart ? `
                        <div class="progress-mini-segment segment-mini-sra ${sraStatusClass}" 
                             style="width: ${timeline.sraWidth}%;">
                        </div>
                        ` : ''}
                    </div>
                    ${timeline.currentPosition > 0 && timeline.currentPosition <= 100 ? `
                    <div class="progress-mini-position" style="left: ${timeline.currentPosition}%;">📍</div>
                    ` : ''}
                </div>
                <span class="progress-percent">${timeline.totalProgress.toFixed(0)}%</span>
            `;
        }
        
        return `
            <tr onclick="showStudentDetail('${student.id}')" style="cursor: pointer;">
                <td><strong>${student.name || '-'}</strong></td>
                <td><small>${currentScore} → ${targetScore}</small></td>
                <td>${progressHTML}</td>
                <td>${preparationHTML}</td>
                <td><small>${student.phone || '-'}</small></td>
                <td>${programBadge}</td>
                <td><small>${period}</small></td>
                <td>${sraStatusClass ? `<span class="badge ${sraStatusClass}">${sraStatus}</span>` : sraStatus}</td>
            </tr>
        `;
    }).join('');
}

/**
 * 학생 카드 렌더링 (사용 안 함 - 테이블로 변경)
 */
function renderStudentCard(student) {
    // 이 함수는 더 이상 사용하지 않음
    return '';
}

// ==========================================
// 성적 표시 헬퍼
// ==========================================
function getScoreDisplay(student, type) {
    if (type === 'current') {
        // 점수 타입이 null이면 미실시
        if (!student.current_score_type) {
            return '<span style="color: #adb5bd;">미실시</span>';
        }
        
        if (student.current_score_type === 'old') {
            return student.old_score_total ? `${student.old_score_total}점` : '-';
        } else if (student.current_score_type === 'new') {
            return student.current_total_level ? `${Number(student.current_total_level).toFixed(1)}` : '-';
        }
    } else if (type === 'target') {
        // 새로운 목표 점수 표시
        const cutoff = student.target_cutoff_total || 5.0;
        const personal = student.target_personal_enabled && student.target_personal_total;
        
        // 섹션별 커트라인 있는지 확인
        const hasSectionCutoff = student.target_cutoff_reading || 
                                student.target_cutoff_listening || 
                                student.target_cutoff_speaking || 
                                student.target_cutoff_writing;
        
        let display = `<span class="target-badge cutoff">${Number(cutoff).toFixed(1)}</span>`;
        
        // 섹션별 요구사항 표시
        if (hasSectionCutoff) {
            const sections = [];
            if (student.target_cutoff_reading) sections.push(`R${student.target_cutoff_reading}`);
            if (student.target_cutoff_listening) sections.push(`L${student.target_cutoff_listening}`);
            if (student.target_cutoff_speaking) sections.push(`S${student.target_cutoff_speaking}`);
            if (student.target_cutoff_writing) sections.push(`W${student.target_cutoff_writing}`);
            if (sections.length > 0) {
                display += `<span style="font-size: 0.75rem; color: #856404; margin-left: 5px;">(${sections.join(', ')})</span>`;
            }
        }
        
        // 개인 희망 표시
        if (personal) {
            display += ` <span class="target-badge personal"><i class="fas fa-arrow-right" style="font-size: 0.7rem;"></i> ${Number(personal).toFixed(1)}</span>`;
        }
        
        return display;
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
    
    // 현재 점수 입력 여부 확인
    const hasCurrentScore = document.getElementById('enableCurrentScore').checked;
    const scoreType = hasCurrentScore ? document.getElementById('newStudentScoreType').value : null;
    
    console.log('입력값:', { name, phone, programType, startDate, hasCurrentScore, scoreType });
    
    if (!name || !phone || !programType || !startDate) {
        alert('필수 항목을 모두 입력해주세요.');
        return;
    }
    
    // 현재 점수를 입력하기로 했는데 타입을 선택 안 한 경우
    if (hasCurrentScore && !scoreType) {
        alert('성적 타입을 선택해주세요.');
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
        slra_available_date: sraEnabled ? formatDateForDB(sraStart) : null,
        slra_status: '대기',
        current_score_type: scoreType // null이면 점수 없음
    };
    
    // 성적 데이터 추가 (점수 입력한 경우만)
    if (scoreType === 'old') {
        // 개정전 - 섹션별은 선택, 총점은 필수
        studentData.old_score_reading = parseFloat(document.getElementById('oldReading').value) || 0;
        studentData.old_score_listening = parseFloat(document.getElementById('oldListening').value) || 0;
        studentData.old_score_speaking = parseFloat(document.getElementById('oldSpeaking').value) || 0;
        studentData.old_score_writing = parseFloat(document.getElementById('oldWriting').value) || 0;
        studentData.old_score_total = parseFloat(document.getElementById('oldTotal').value) || 0;
    } else if (scoreType === 'new') {
        // 개정후 - 섹션별은 선택, 총 레벨은 필수
        studentData.current_level_reading = parseFloat(document.getElementById('newReading').value) || 0;
        studentData.current_level_listening = parseFloat(document.getElementById('newListening').value) || 0;
        studentData.current_level_speaking = parseFloat(document.getElementById('newSpeaking').value) || 0;
        studentData.current_level_writing = parseFloat(document.getElementById('newWriting').value) || 0;
        studentData.current_total_level = parseFloat(document.getElementById('newTotal').value) || 0;
    }
    // scoreType이 null이면 점수 필드를 아예 추가하지 않음 (NULL로 저장됨)
    
    // 목표 점수 - 합격 커트라인 (필수)
    studentData.target_cutoff_total = parseFloat(document.getElementById('targetCutoffTotal').value) || 5.0;
    
    // 섹션별 커트라인 (선택)
    const enableSectionCutoff = document.getElementById('enableSectionCutoff').checked;
    if (enableSectionCutoff) {
        studentData.target_cutoff_reading = parseFloat(document.getElementById('targetCutoffReading').value) || null;
        studentData.target_cutoff_listening = parseFloat(document.getElementById('targetCutoffListening').value) || null;
        studentData.target_cutoff_speaking = parseFloat(document.getElementById('targetCutoffSpeaking').value) || null;
        studentData.target_cutoff_writing = parseFloat(document.getElementById('targetCutoffWriting').value) || null;
    }
    
    // 개인 희망 점수 (선택)
    const enablePersonalTarget = document.getElementById('enablePersonalTarget').checked;
    studentData.target_personal_enabled = enablePersonalTarget;
    
    if (enablePersonalTarget) {
        const personalMode = document.getElementById('personalTargetMode').value;
        studentData.target_personal_type = personalMode;
        
        if (personalMode === 'total') {
            studentData.target_personal_total = parseFloat(document.getElementById('targetPersonalTotal').value) || null;
        } else {
            studentData.target_personal_reading = parseFloat(document.getElementById('targetPersonalReading').value) || null;
            studentData.target_personal_listening = parseFloat(document.getElementById('targetPersonalListening').value) || null;
            studentData.target_personal_speaking = parseFloat(document.getElementById('targetPersonalSpeaking').value) || null;
            studentData.target_personal_writing = parseFloat(document.getElementById('targetPersonalWriting').value) || null;
            
            // 평균 계산
            const values = [
                studentData.target_personal_reading,
                studentData.target_personal_listening,
                studentData.target_personal_speaking,
                studentData.target_personal_writing
            ].filter(v => v !== null && v > 0);
            
            if (values.length > 0) {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                studentData.target_personal_total = Math.round(avg * 2) / 2;
            }
        }
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
        studentData.deposit_amount = parseFloat(cleaned) || 0;
    }
    
    // 신청 단계 기본값
    studentData.contract_completed = false;
    studentData.delivery_completed = false;
    studentData.access_completed = false;
    studentData.notification_completed = false;
    studentData.review_submitted = false;
    studentData.payment_completed = false;
    
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
    document.getElementById('infoSraAvailable').textContent = currentStudent.slra_available_date || '-';
    
    // 타임라인 상세 렌더링
    renderDetailTimeline();
}

/**
 * 상세 화면 타임라인 렌더링 (옵션 C)
 */
function renderDetailTimeline() {
    if (!currentStudent) return;
    
    const container = document.getElementById('detailTimelineContainer');
    const timeline = calculateTimeline(currentStudent);
    
    if (!timeline || !timeline.challengeStart) {
        container.innerHTML = `
            <div class="detail-timeline-container">
                <div style="text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-calendar-times" style="font-size: 3rem; margin-bottom: 15px;"></i>
                    <p>챌린지 일정이 설정되지 않았습니다</p>
                </div>
            </div>
        `;
        return;
    }
    
    const challengeClass = timeline.programType === 'fast' ? 'segment-challenge-fast' : 'segment-challenge-standard';
    const challengeLabel = timeline.programType === 'fast' ? 'Fast Challenge' : 'Standard Challenge';
    const challengeStatusClass = timeline.challengeStatus === 'completed' ? 'segment-completed' : 
                                 timeline.challengeStatus === 'upcoming' ? 'segment-upcoming' : '';
    const sraStatusClass = timeline.sraStatus === 'completed' ? 'segment-completed' : 
                           timeline.sraStatus === 'upcoming' ? 'segment-upcoming' : '';
    
    // D-Day 텍스트
    let currentPhaseText = '';
    if (timeline.challengeStatus === 'active') {
        const elapsed = calculateDaysBetween(timeline.challengeStart, timeline.today);
        const remaining = timeline.challengeDays - elapsed + 1;
        currentPhaseText = `챌린지 진행 중 (D${remaining > 0 ? '-' + remaining : '+' + Math.abs(remaining)})`;
    } else if (timeline.sraStatus === 'active') {
        const elapsed = calculateDaysBetween(timeline.sraStart, timeline.today);
        const remaining = timeline.sraDays - elapsed + 1;
        currentPhaseText = `첨삭 진행 중 (D${remaining > 0 ? '-' + remaining : '+' + Math.abs(remaining)})`;
    } else if (timeline.challengeStatus === 'completed' && timeline.sraStatus === 'completed') {
        currentPhaseText = '전체 과정 완료';
    } else if (timeline.challengeStatus === 'upcoming') {
        currentPhaseText = '시작 대기 중';
    }
    
    container.innerHTML = `
        <div class="detail-timeline-container">
            <div class="detail-timeline-title">
                <i class="fas fa-calendar-alt"></i>
                전체 진행 일정
            </div>
            
            <div class="detail-timeline-bar timeline-progress-bar">
                <div class="timeline-segments">
                    <div class="detail-timeline-segment timeline-segment ${challengeClass} ${challengeStatusClass}" 
                         style="width: ${timeline.challengeWidth}%;">
                        ${challengeLabel} (${timeline.challengeDays}일)
                    </div>
                    ${timeline.sraStart ? `
                    <div class="detail-timeline-segment timeline-segment segment-sra ${sraStatusClass}" 
                         style="width: ${timeline.sraWidth}%;">
                        스라첨삭 (${timeline.sraDays}일)
                    </div>
                    ` : ''}
                </div>
                
                ${timeline.currentPosition > 0 && timeline.currentPosition <= 100 ? `
                <div class="timeline-current-position" style="left: ${timeline.currentPosition}%;">
                    <div class="current-position-icon">📍</div>
                    <div class="current-position-label">오늘</div>
                </div>
                ` : ''}
            </div>
            
            <div class="detail-timeline-info">
                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <span class="detail-info-label">챌린지 시작</span>
                        <span class="detail-info-value">${formatDate(timeline.challengeStart)}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="detail-info-label">챌린지 종료</span>
                        <span class="detail-info-value">${formatDate(timeline.challengeEnd)}</span>
                    </div>
                    ${timeline.sraStart ? `
                    <div class="detail-info-item">
                        <span class="detail-info-label">첨삭 시작</span>
                        <span class="detail-info-value">${formatDate(timeline.sraStart)}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="detail-info-label">첨삭 종료</span>
                        <span class="detail-info-value">${formatDate(timeline.sraEnd)}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="detail-info-label">담당 선생님</span>
                        <span class="detail-info-value">${timeline.sraTeacher || '-'}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="detail-info-label">첨삭 요일</span>
                        <span class="detail-info-value">${timeline.sraDay || '-'}</span>
                    </div>
                    ` : ''}
                    <div class="detail-info-item">
                        <span class="detail-info-label">전체 기간</span>
                        <span class="detail-info-value">${timeline.totalDays}일</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="detail-info-label">현재 상태</span>
                        <span class="detail-info-value">${currentPhaseText}</span>
                    </div>
                </div>
                
                <div class="detail-progress-stats">
                    <div class="progress-stat-item">
                        <span class="progress-stat-label">챌린지 진행률</span>
                        <span class="progress-stat-value">${timeline.challengeProgress.toFixed(1)}%</span>
                    </div>
                    ${timeline.sraStart ? `
                    <div class="progress-stat-item">
                        <span class="progress-stat-label">첨삭 진행률</span>
                        <span class="progress-stat-value">${timeline.sraProgress.toFixed(1)}%</span>
                    </div>
                    ` : ''}
                    <div class="progress-stat-item">
                        <span class="progress-stat-label">전체 진행률</span>
                        <span class="progress-stat-value" style="font-size: 1.1rem; color: #2c3e50;">
                            ${timeline.totalProgress.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
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
    if (!currentStudent.current_score_type) {
        // 점수 없음 - 안내 메시지 + 버튼
        currentScoresDiv.innerHTML = `
            <div class="no-score-state">
                <div class="no-score-icon">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <div class="no-score-message">
                    아직 시험 결과가 없습니다
                </div>
                <div class="no-score-hint">
                    첫 시험 후 성적이 자동으로 업데이트됩니다
                </div>
                <div class="no-score-action">
                    <button class="btn btn-primary btn-sm" onclick="switchToTestResultsTab()">
                        <i class="fas fa-plus"></i> 첫 시험 결과 등록
                    </button>
                </div>
            </div>
        `;
    } else if (currentStudent.current_score_type === 'old') {
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
    
    // 목표 점수 - 새로운 디자인
    let targetHTML = '';
    
    // 합격 커트라인
    targetHTML += `
        <div style="background: linear-gradient(135deg, #fff3cd 0%, #fffaeb 100%); 
                    padding: 15px; border-radius: 8px; margin-bottom: 15px; 
                    border-left: 4px solid #ffc107;">
            <h5 style="margin-bottom: 10px; color: #e67e22; font-size: 0.95rem;">
                <i class="fas fa-certificate"></i> 합격 커트라인
            </h5>
            <div class="score-item">
                <span class="score-label"><strong>총점 커트</strong></span>
                <span class="score-value"><strong>${Number(currentStudent.target_cutoff_total || 5.0).toFixed(1)}</strong></span>
            </div>
    `;
    
    // 섹션별 커트라인 (있는 경우)
    const hasSectionCutoff = currentStudent.target_cutoff_reading || 
                            currentStudent.target_cutoff_listening || 
                            currentStudent.target_cutoff_speaking || 
                            currentStudent.target_cutoff_writing;
    
    if (hasSectionCutoff) {
        targetHTML += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ffc107;">
            <p style="font-size: 0.85rem; color: #856404; margin-bottom: 8px;">
                <i class="fas fa-info-circle"></i> 섹션별 최소 요구:
            </p>`;
        
        if (currentStudent.target_cutoff_reading) {
            targetHTML += `
            <div class="score-item" style="padding: 4px 0;">
                <span class="score-label">Reading</span>
                <span class="score-value">${Number(currentStudent.target_cutoff_reading).toFixed(1)} 이상</span>
            </div>`;
        }
        if (currentStudent.target_cutoff_listening) {
            targetHTML += `
            <div class="score-item" style="padding: 4px 0;">
                <span class="score-label">Listening</span>
                <span class="score-value">${Number(currentStudent.target_cutoff_listening).toFixed(1)} 이상</span>
            </div>`;
        }
        if (currentStudent.target_cutoff_speaking) {
            targetHTML += `
            <div class="score-item" style="padding: 4px 0;">
                <span class="score-label">Speaking</span>
                <span class="score-value">${Number(currentStudent.target_cutoff_speaking).toFixed(1)} 이상</span>
            </div>`;
        }
        if (currentStudent.target_cutoff_writing) {
            targetHTML += `
            <div class="score-item" style="padding: 4px 0;">
                <span class="score-label">Writing</span>
                <span class="score-value">${Number(currentStudent.target_cutoff_writing).toFixed(1)} 이상</span>
            </div>`;
        }
        
        targetHTML += `</div>`;
    }
    
    targetHTML += `</div>`;
    
    // 개인 희망 점수 (설정한 경우)
    if (currentStudent.target_personal_enabled) {
        targetHTML += `
            <div style="background: linear-gradient(135deg, #e7f3ff 0%, #f0f7ff 100%); 
                        padding: 15px; border-radius: 8px; 
                        border-left: 4px solid #2196F3;">
                <h5 style="margin-bottom: 10px; color: #3498db; font-size: 0.95rem;">
                    <i class="fas fa-star"></i> 개인 희망 점수
                </h5>
                <div class="score-item">
                    <span class="score-label"><strong>목표 레벨</strong></span>
                    <span class="score-value"><strong>${Number(currentStudent.target_personal_total || 0).toFixed(1)}</strong></span>
                </div>
        `;
        
        // 섹션별 목표 (있는 경우)
        if (currentStudent.target_personal_type === 'sections') {
            const hasPersonalSections = currentStudent.target_personal_reading || 
                                       currentStudent.target_personal_listening || 
                                       currentStudent.target_personal_speaking || 
                                       currentStudent.target_personal_writing;
            
            if (hasPersonalSections) {
                targetHTML += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #2196F3;">`;
                
                if (currentStudent.target_personal_reading) {
                    targetHTML += `
                    <div class="score-item" style="padding: 4px 0;">
                        <span class="score-label">Reading</span>
                        <span class="score-value">${Number(currentStudent.target_personal_reading).toFixed(1)}</span>
                    </div>`;
                }
                if (currentStudent.target_personal_listening) {
                    targetHTML += `
                    <div class="score-item" style="padding: 4px 0;">
                        <span class="score-label">Listening</span>
                        <span class="score-value">${Number(currentStudent.target_personal_listening).toFixed(1)}</span>
                    </div>`;
                }
                if (currentStudent.target_personal_speaking) {
                    targetHTML += `
                    <div class="score-item" style="padding: 4px 0;">
                        <span class="score-label">Speaking</span>
                        <span class="score-value">${Number(currentStudent.target_personal_speaking).toFixed(1)}</span>
                    </div>`;
                }
                if (currentStudent.target_personal_writing) {
                    targetHTML += `
                    <div class="score-item" style="padding: 4px 0;">
                        <span class="score-label">Writing</span>
                        <span class="score-value">${Number(currentStudent.target_personal_writing).toFixed(1)}</span>
                    </div>`;
                }
                
                targetHTML += `</div>`;
            }
        }
        
        targetHTML += `</div>`;
    }
    
    targetScoresDiv.innerHTML = targetHTML;
    
    // 진행도 바 추가
    if (currentStudent.current_score_type === 'new' && currentStudent.current_total_level) {
        // 점수 있는 경우
        const currentLevel = Number(currentStudent.current_total_level);
        const cutoffTarget = Number(currentStudent.target_cutoff_total || 5.0);
        const personalTarget = currentStudent.target_personal_enabled ? Number(currentStudent.target_personal_total || 0) : null;
        
        let progressHTML = '<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">';
        progressHTML += '<h5 style="margin-bottom: 15px; font-size: 0.95rem; color: #333;"><i class="fas fa-chart-line"></i> 목표 달성 현황</h5>';
        
        // 합격 커트라인 진행도
        const cutoffProgress = Math.min((currentLevel / cutoffTarget) * 100, 100);
        const cutoffAchieved = currentLevel >= cutoffTarget;
        
        progressHTML += `
            <div class="progress-container" style="margin-bottom: 15px;">
                <div class="progress-label">
                    <span>합격 커트라인 (${cutoffTarget.toFixed(1)})</span>
                    <span>${cutoffAchieved ? '<i class="fas fa-check-circle" style="color: #4caf50;"></i> 달성!' : cutoffProgress.toFixed(0) + '%'}</span>
                </div>
                <div class="progress-bar-wrapper">
                    <div class="progress-bar ${cutoffAchieved ? 'complete' : cutoffProgress >= 90 ? 'near-complete' : ''}" 
                         style="width: ${cutoffProgress}%">
                        ${cutoffProgress >= 20 ? currentLevel.toFixed(1) : ''}
                    </div>
                </div>
            </div>
        `;
        
        // 개인 희망 진행도
        if (personalTarget && personalTarget > 0) {
            const personalProgress = Math.min((currentLevel / personalTarget) * 100, 100);
            const personalAchieved = currentLevel >= personalTarget;
            
            progressHTML += `
                <div class="progress-container">
                    <div class="progress-label">
                        <span>개인 희망 (${personalTarget.toFixed(1)})</span>
                        <span>${personalAchieved ? '<i class="fas fa-check-circle" style="color: #2196F3;"></i> 달성!' : personalProgress.toFixed(0) + '%'}</span>
                    </div>
                    <div class="progress-bar-wrapper">
                        <div class="progress-bar personal ${personalAchieved ? 'complete' : ''}" 
                             style="width: ${personalProgress}%">
                            ${personalProgress >= 20 ? currentLevel.toFixed(1) : ''}
                        </div>
                    </div>
                </div>
            `;
        }
        
        progressHTML += '</div>';
        targetScoresDiv.innerHTML += progressHTML;
    } else if (!currentStudent.current_score_type) {
        // 점수 없는 경우 - 0% 진행도 바 표시
        const cutoffTarget = Number(currentStudent.target_cutoff_total || 5.0);
        const personalTarget = currentStudent.target_personal_enabled ? Number(currentStudent.target_personal_total || 0) : null;
        
        let progressHTML = '<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">';
        progressHTML += '<h5 style="margin-bottom: 15px; font-size: 0.95rem; color: #333;"><i class="fas fa-chart-line"></i> 목표 달성 현황</h5>';
        
        // 합격 커트라인 진행도 (0%)
        progressHTML += `
            <div class="progress-container" style="margin-bottom: 15px;">
                <div class="progress-label">
                    <span>합격 커트라인 (${cutoffTarget.toFixed(1)})</span>
                    <span style="color: #adb5bd;">아직 시험 없음</span>
                </div>
                <div class="progress-bar-wrapper">
                    <div class="progress-bar" style="width: 0%; background: #dee2e6;"></div>
                </div>
            </div>
        `;
        
        // 개인 희망 진행도 (0%)
        if (personalTarget && personalTarget > 0) {
            progressHTML += `
                <div class="progress-container">
                    <div class="progress-label">
                        <span>개인 희망 (${personalTarget.toFixed(1)})</span>
                        <span style="color: #adb5bd;">아직 시험 없음</span>
                    </div>
                    <div class="progress-bar-wrapper">
                        <div class="progress-bar personal" style="width: 0%; background: #dee2e6;"></div>
                    </div>
                </div>
            `;
        }
        
        progressHTML += '</div>';
        targetScoresDiv.innerHTML += progressHTML;
    }
    
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
    
    // 8단계 정의
    const steps = [
        { field: 'analysis_uploaded', label: '분석지 업로드', icon: 'fa-file-alt', dateField: 'analysis_uploaded_at' },
        { field: 'student_agreed', label: '학생 동의', icon: 'fa-user-check', dateField: 'student_agreed_at' },
        { field: 'contract_completed', label: '계약서 체결', icon: 'fa-file-contract', dateField: 'contract_completed_at' },
        { field: 'payment_completed', label: '입금 확인', icon: 'fa-won-sign', dateField: 'payment_completed_at' },
        { field: 'guide_sent', label: '이용방법 전송', icon: 'fa-paper-plane', dateField: 'guide_sent_at' },
        { field: 'delivery_completed', label: '택배 발송', icon: 'fa-box', dateField: 'delivery_completed_at' },
        { field: 'access_completed', label: '액세스 부여', icon: 'fa-key', dateField: 'access_completed_at' },
        { field: 'notification_completed', label: '알림톡 발송', icon: 'fa-bell', dateField: 'notification_completed_at' }
    ];
    
    let completedCount = 0;
    let nextAction = null;
    let html = '';
    
    steps.forEach((step, index) => {
        const completed = currentStudent[step.field];
        const stepNum = index + 1;
        
        let statusClass = '';
        let statusIcon = '';
        let statusBadge = '';
        let actionHtml = '';
        
        if (completed) {
            // 완료된 단계
            statusClass = 'completed';
            statusIcon = '<i class="fas fa-check-circle"></i>';
            statusBadge = '<span class="step-status-badge status-badge-completed">완료</span>';
            
            const completedDate = currentStudent[step.dateField] || '';
            actionHtml = `<span class="step-date">${completedDate ? formatDate(completedDate) : '완료됨'}</span>`;
            
            completedCount++;
        } else if (nextAction === null) {
            // 현재 단계 (다음 액션)
            statusClass = 'current';
            statusIcon = '<i class="fas fa-bolt"></i>';
            statusBadge = '<span class="step-status-badge status-badge-current">진행중</span>';
            actionHtml = `
                <div class="step-action-compact">
                    <button class="btn-complete-compact" onclick="completeStep('${step.field}')">
                        <i class="fas fa-check"></i> ${step.label} 완료하기
                    </button>
                </div>
            `;
            nextAction = step.label;
        } else {
            // 대기 중
            statusClass = 'waiting';
            statusIcon = '<i class="fas fa-pause-circle"></i>';
            statusBadge = '<span class="step-status-badge status-badge-waiting">대기중</span>';
            actionHtml = '';
        }
        
        html += `
            <div class="flow-step-row ${statusClass}">
                <div class="step-icon">
                    ${statusIcon}
                </div>
                <div class="step-info">
                    <span class="step-number">${stepNum}.</span>
                    <span class="step-name">${step.label}</span>
                </div>
                ${statusBadge}
                ${actionHtml}
            </div>
        `;
    });
    
    // HTML 삽입
    document.getElementById('preparationStepsCompact').innerHTML = html;
    
    // 헤더 정보 업데이트
    document.getElementById('flowProgressBadge').textContent = `${completedCount}/8 완료`;
    document.getElementById('flowNextAction').textContent = nextAction || '모든 단계 완료! 🎉';
}

// ==========================================
// 단계 완료 처리
// ==========================================
async function completeStep(stepField) {
    if (!currentStudent) return;
    
    // 확인 메시지
    const stepLabels = {
        'analysis_uploaded': '분석지 업로드',
        'student_agreed': '학생 동의',
        'contract_completed': '계약서 체결',
        'payment_completed': '입금 확인',
        'guide_sent': '이용방법 전송',
        'delivery_completed': '택배 발송',
        'access_completed': '액세스 부여',
        'notification_completed': '알림톡 발송'
    };
    
    const label = stepLabels[stepField] || '단계';
    
    if (!confirm(`"${label}" 단계를 완료 처리하시겠습니까?`)) {
        return;
    }
    
    try {
        // 완료 날짜 필드
        const dateField = stepField + '_at';
        const now = new Date().toISOString();
        
        const updateData = {
            [stepField]: true,
            [dateField]: now
        };
        
        // Supabase 업데이트
        const response = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${currentStudent.id}`, {
            method: 'PATCH',
            headers: getSupabaseHeaders(),
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error('단계 완료 처리 실패');
        }
        
        // 로컬 데이터 업데이트
        currentStudent[stepField] = true;
        currentStudent[dateField] = now;
        
        // students 배열에서도 업데이트
        const studentIndex = students.findIndex(s => s.id === currentStudent.id);
        if (studentIndex !== -1) {
            students[studentIndex][stepField] = true;
            students[studentIndex][dateField] = now;
        }
        
        // UI 재렌더링
        renderProgress();
        renderStudentsTable();
        
        alert(`"${label}" 단계가 완료되었습니다! ✅`);
        
    } catch (error) {
        console.error('단계 완료 오류:', error);
        alert('단계 완료 처리 중 오류가 발생했습니다.');
    }
}

// ==========================================
// 스라첨삭 탭 렌더링
// ==========================================
function renderSra() {
    if (!currentStudent) return;
    
    const sraDiv = document.getElementById('sraContent');
    
    // 첨삭 신청 여부 확인
    const sraEnabled = currentStudent.program_type && 
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
    const availableDate = currentStudent.slra_available_date || '-';
    
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
    document.getElementById('slotAvailableDate').textContent = formatDate(student.slra_available_date);
    
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
    const sraStartDate = new Date(student.slra_available_date);
    
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
    const sraStartDate = new Date(student.slra_available_date);
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
    
    document.getElementById('confirmSraAvailable').textContent = formatDate(student.slra_available_date);
    
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
            row.push(student.slra_available_date || '');
            
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
                const sraEnabled = student.program_type && student.program_type.endsWith('_sra');
                if (!sraEnabled) {
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
            row.push(student.payment_completed ? 'O' : 'X');
            
            // 입금액
            row.push(student.deposit_amount ? student.deposit_amount.toLocaleString() : '');
            
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
// 탭 전환 함수
// ==========================================
function switchToTestResultsTab() {
    // 모든 탭 버튼과 탭 패널 비활성화
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    // 시험결과 탭 활성화
    const testResultsTab = document.querySelector('[data-tab="test-results"]');
    const testResultsPane = document.getElementById('test-results');
    
    if (testResultsTab) testResultsTab.classList.add('active');
    if (testResultsPane) testResultsPane.classList.add('active');
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
// 준비 단계 계산 함수
// ==========================================

/**
 * 학생의 준비 단계 계산
 * @param {Object} student - 학생 객체
 * @returns {Object} 준비 단계 정보
 */
function calculatePreparationSteps(student) {
    if (!student) return null;
    
    const steps = [
        { 
            id: 1, 
            name: '분석지 업로드', 
            icon: '📤', 
            field: 'analysis_uploaded',
            completed: student.analysis_uploaded || false
        },
        { 
            id: 2, 
            name: '학생 동의', 
            icon: '✍️', 
            field: 'student_agreed',
            completed: student.student_agreed || false
        },
        { 
            id: 3, 
            name: '계약서 체결', 
            icon: '📄', 
            field: 'contract_completed',
            completed: student.contract_completed || false
        },
        { 
            id: 4, 
            name: '입금 확인', 
            icon: '💰', 
            field: 'payment_completed',
            completed: student.payment_completed || false
        },
        { 
            id: 5, 
            name: '이용방법 전송', 
            icon: '📧', 
            field: 'guide_sent',
            completed: student.guide_sent || false
        },
        { 
            id: 6, 
            name: '택배 발송', 
            icon: '📦', 
            field: 'delivery_completed',
            completed: student.delivery_completed || false
        },
        { 
            id: 7, 
            name: '액세스 부여', 
            icon: '🔑', 
            field: 'access_completed',
            completed: student.access_completed || false
        },
        { 
            id: 8, 
            name: '알림톡 발송', 
            icon: '📲', 
            field: 'notification_completed',
            completed: student.notification_completed || false
        }
    ];
    
    // 완료된 단계 수
    const completedCount = steps.filter(s => s.completed).length;
    
    // 현재 진행 중인 단계 (첫 번째 미완료 단계)
    const currentStepIndex = steps.findIndex(s => !s.completed);
    const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
    
    // 모든 단계 완료 여부
    const allCompleted = completedCount === steps.length;
    
    return {
        steps,
        completedCount,
        totalCount: steps.length,
        currentStep,
        allCompleted,
        percentage: Math.round((completedCount / steps.length) * 100)
    };
}

/**
 * 준비 단계 HTML 렌더링
 * @param {Object} student - 학생 객체
 * @returns {string} HTML
 */
function renderPreparationSteps(student) {
    const prep = calculatePreparationSteps(student);
    if (!prep) return '-';
    
    const stepsHTML = prep.steps.map((step, index) => {
        let className = 'prep-step pending';
        
        if (step.completed) {
            className = 'prep-step completed';
        } else if (prep.currentStep && step.id === prep.currentStep.id) {
            className = 'prep-step current';
        }
        
        return `
            <div class="${className}" title="${step.icon} ${step.name}">
                <div class="prep-tooltip">${step.icon} ${step.name}</div>
            </div>
        `;
    }).join('');
    
    const completeIcon = prep.allCompleted ? '<span class="prep-complete">✅</span>' : '';
    
    return `
        <div class="preparation-steps">
            ${stepsHTML}
        </div>
        <span class="prep-count">${prep.completedCount}/${prep.totalCount}</span>
        ${completeIcon}
    `;
}

// ==========================================
// 타임라인 계산 함수
// ==========================================

/**
 * 타임라인 데이터 계산
 * @param {Object} student - 학생 객체
 * @returns {Object} 타임라인 정보
 */
function calculateTimeline(student) {
    if (!student) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 챌린지 정보
    const challengeStart = student.challenge_start_date ? new Date(student.challenge_start_date) : null;
    const challengeEnd = student.challenge_end_date ? new Date(student.challenge_end_date) : null;
    
    // 프로그램 타입
    const programType = student.program_type || '';
    const isFast = programType.includes('fast');
    const challengeDays = isFast ? 28 : 56;
    
    // 첨삭 정보
    const sraAssignment = assignments.find(a => 
        a.student_id === student.id && 
        a.status !== '완료'
    );
    
    const sraStart = sraAssignment && sraAssignment.start_date ? new Date(sraAssignment.start_date) : null;
    const sraEnd = sraAssignment && sraAssignment.end_date ? new Date(sraAssignment.end_date) : null;
    const sraDays = sraStart && sraEnd ? Math.ceil((sraEnd - sraStart) / (1000 * 60 * 60 * 24)) + 1 : 28;
    
    // 전체 기간
    const totalDays = challengeDays + (sraStart ? sraDays : 0);
    
    // 챌린지 진행률
    let challengeProgress = 0;
    let challengeStatus = 'upcoming'; // upcoming, active, completed
    
    if (challengeStart && challengeEnd) {
        if (today < challengeStart) {
            challengeStatus = 'upcoming';
            challengeProgress = 0;
        } else if (today > challengeEnd) {
            challengeStatus = 'completed';
            challengeProgress = 100;
        } else {
            challengeStatus = 'active';
            const elapsed = Math.ceil((today - challengeStart) / (1000 * 60 * 60 * 24));
            challengeProgress = Math.min((elapsed / challengeDays) * 100, 100);
        }
    }
    
    // 첨삭 진행률
    let sraProgress = 0;
    let sraStatus = 'upcoming'; // upcoming, active, completed, none
    
    if (sraStart && sraEnd) {
        if (today < sraStart) {
            sraStatus = 'upcoming';
            sraProgress = 0;
        } else if (today > sraEnd) {
            sraStatus = 'completed';
            sraProgress = 100;
        } else {
            sraStatus = 'active';
            const elapsed = Math.ceil((today - sraStart) / (1000 * 60 * 60 * 24));
            sraProgress = Math.min((elapsed / sraDays) * 100, 100);
        }
    } else {
        sraStatus = 'none';
    }
    
    // 전체 진행률
    let totalProgress = 0;
    if (challengeStart) {
        const startDate = challengeStart;
        const endDate = sraEnd || challengeEnd;
        
        if (endDate && today >= startDate) {
            const totalDuration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const elapsed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
            totalProgress = Math.min((elapsed / totalDuration) * 100, 100);
        }
    }
    
    // 현재 위치 (0-100%)
    let currentPosition = 0;
    if (challengeStart) {
        if (sraEnd) {
            // 챌린지 + 첨삭 전체 기간 기준
            const totalStart = challengeStart;
            const totalEnd = sraEnd;
            const totalDuration = Math.ceil((totalEnd - totalStart) / (1000 * 60 * 60 * 24)) + 1;
            const elapsed = Math.ceil((today - totalStart) / (1000 * 60 * 60 * 24));
            currentPosition = Math.max(0, Math.min((elapsed / totalDuration) * 100, 100));
        } else if (challengeEnd) {
            // 챌린지만
            const elapsed = Math.ceil((today - challengeStart) / (1000 * 60 * 60 * 24));
            currentPosition = Math.max(0, Math.min((elapsed / challengeDays) * 100, 100));
        }
    }
    
    // 세그먼트 너비 계산
    const challengeWidth = sraStart ? (challengeDays / totalDays) * 100 : 100;
    const sraWidth = sraStart ? (sraDays / totalDays) * 100 : 0;
    
    // D-Day 계산
    let dDay = null;
    let dDayLabel = '';
    
    if (challengeStatus === 'active' && challengeEnd) {
        const remaining = Math.ceil((challengeEnd - today) / (1000 * 60 * 60 * 24));
        dDay = remaining;
        dDayLabel = `챌린지 D${remaining > 0 ? '-' + remaining : '+' + Math.abs(remaining)}`;
    } else if (sraStatus === 'active' && sraEnd) {
        const remaining = Math.ceil((sraEnd - today) / (1000 * 60 * 60 * 24));
        dDay = remaining;
        dDayLabel = `첨삭 D${remaining > 0 ? '-' + remaining : '+' + Math.abs(remaining)}`;
    }
    
    return {
        // 기본 정보
        programType: isFast ? 'fast' : 'standard',
        
        // 챌린지
        challengeStart,
        challengeEnd,
        challengeDays,
        challengeProgress,
        challengeStatus,
        challengeWidth,
        
        // 첨삭
        sraStart,
        sraEnd,
        sraDays,
        sraProgress,
        sraStatus,
        sraWidth,
        sraTeacher: sraAssignment?.teacher_name || null,
        sraDay: sraAssignment?.session_day || null,
        
        // 전체
        totalDays,
        totalProgress,
        currentPosition,
        
        // D-Day
        dDay,
        dDayLabel,
        
        // 오늘 날짜
        today: formatDateForDB(today)
    };
}

/**
 * 날짜 형식 변환 (간단한 형태)
 * @param {Date|string} date 
 * @returns {string} M/D 형태
 */
function formatDateShort(date) {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 기간 계산 (일수)
 * @param {Date} start 
 * @param {Date} end 
 * @returns {number}
 */
function calculateDaysBetween(start, end) {
    if (!start || !end) return 0;
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
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
        slra_available_date: formatDateForDB(sraStart)
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
    
    // 현재 점수 체크박스 상태
    const hasScore = currentStudent.current_score_type !== null;
    const enableCheckbox = document.getElementById('editEnableCurrentScore');
    const currentScoreInputs = document.getElementById('editCurrentScoreInputs');
    const scoreStatusHint = document.getElementById('editScoreStatusHint');
    
    enableCheckbox.checked = hasScore;
    
    if (hasScore) {
        currentScoreInputs.style.display = 'block';
        currentScoreInputs.classList.add('active');
        
        const currentLevel = currentStudent.current_total_level || currentStudent.old_score_total || 0;
        scoreStatusHint.textContent = `💡 현재: ${currentLevel}`;
        
        const scoreType = currentStudent.current_score_type;
        document.getElementById('editScoreType').value = scoreType;
        
        // 필드 표시/숨김
        const oldFields = document.getElementById('editOldScoreFields');
        const newFields = document.getElementById('editNewScoreFields');
        
        if (scoreType === 'old') {
            oldFields.style.display = 'block';
            newFields.style.display = 'none';
            
            document.getElementById('editOldReading').value = currentStudent.old_score_reading || '';
            document.getElementById('editOldListening').value = currentStudent.old_score_listening || '';
            document.getElementById('editOldSpeaking').value = currentStudent.old_score_speaking || '';
            document.getElementById('editOldWriting').value = currentStudent.old_score_writing || '';
            document.getElementById('editOldTotal').value = currentStudent.old_score_total || '';
        } else {
            oldFields.style.display = 'none';
            newFields.style.display = 'block';
            
            document.getElementById('editNewReading').value = currentStudent.current_level_reading || '';
            document.getElementById('editNewListening').value = currentStudent.current_level_listening || '';
            document.getElementById('editNewSpeaking').value = currentStudent.current_level_speaking || '';
            document.getElementById('editNewWriting').value = currentStudent.current_level_writing || '';
            document.getElementById('editNewTotal').value = currentStudent.current_total_level || '';
        }
    } else {
        currentScoreInputs.style.display = 'none';
        currentScoreInputs.classList.remove('active');
        scoreStatusHint.textContent = '💡 현재: 점수 없음';
    }
    
    // 목표 점수 - 합격 커트라인
    document.getElementById('editTargetCutoffTotal').value = currentStudent.target_cutoff_total || 5.0;
    
    // 섹션별 커트라인
    const hasSectionCutoff = currentStudent.target_cutoff_reading || 
                            currentStudent.target_cutoff_listening || 
                            currentStudent.target_cutoff_speaking || 
                            currentStudent.target_cutoff_writing;
    
    const editEnableSectionCutoff = document.getElementById('editEnableSectionCutoff');
    const editSectionCutoffInputs = document.getElementById('editSectionCutoffInputs');
    
    editEnableSectionCutoff.checked = hasSectionCutoff;
    if (hasSectionCutoff) {
        editSectionCutoffInputs.style.display = 'block';
        editSectionCutoffInputs.classList.add('active');
        
        document.getElementById('editTargetCutoffReading').value = currentStudent.target_cutoff_reading || '';
        document.getElementById('editTargetCutoffListening').value = currentStudent.target_cutoff_listening || '';
        document.getElementById('editTargetCutoffSpeaking').value = currentStudent.target_cutoff_speaking || '';
        document.getElementById('editTargetCutoffWriting').value = currentStudent.target_cutoff_writing || '';
    } else {
        editSectionCutoffInputs.style.display = 'none';
        editSectionCutoffInputs.classList.remove('active');
    }
    
    // 개인 희망 점수
    const hasPersonalTarget = currentStudent.target_personal_enabled;
    const editEnablePersonalTarget = document.getElementById('editEnablePersonalTarget');
    const editPersonalTargetInputs = document.getElementById('editPersonalTargetInputs');
    
    editEnablePersonalTarget.checked = hasPersonalTarget;
    if (hasPersonalTarget) {
        editPersonalTargetInputs.style.display = 'block';
        editPersonalTargetInputs.classList.add('active');
        
        const personalMode = currentStudent.target_personal_type || 'total';
        document.getElementById('editPersonalTargetMode').value = personalMode;
        
        const editPersonalTotalInput = document.getElementById('editPersonalTotalInput');
        const editPersonalSectionsInput = document.getElementById('editPersonalSectionsInput');
        
        if (personalMode === 'total') {
            editPersonalTotalInput.style.display = 'block';
            editPersonalSectionsInput.style.display = 'none';
            document.getElementById('editTargetPersonalTotal').value = currentStudent.target_personal_total || '';
        } else {
            editPersonalTotalInput.style.display = 'none';
            editPersonalSectionsInput.style.display = 'block';
            document.getElementById('editTargetPersonalReading').value = currentStudent.target_personal_reading || '';
            document.getElementById('editTargetPersonalListening').value = currentStudent.target_personal_listening || '';
            document.getElementById('editTargetPersonalSpeaking').value = currentStudent.target_personal_speaking || '';
            document.getElementById('editTargetPersonalWriting').value = currentStudent.target_personal_writing || '';
        }
    } else {
        editPersonalTargetInputs.style.display = 'none';
        editPersonalTargetInputs.classList.remove('active');
    }
    
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
    
    const updateData = {};
    
    // 현재 점수 입력 여부
    const hasCurrentScore = document.getElementById('editEnableCurrentScore').checked;
    
    if (hasCurrentScore) {
        const scoreType = document.getElementById('editScoreType').value;
        
        if (!scoreType) {
            alert('성적 타입을 선택해주세요.');
            return;
        }
        
        updateData.current_score_type = scoreType;
        
        if (scoreType === 'old') {
            updateData.old_score_reading = parseFloat(document.getElementById('editOldReading').value) || 0;
            updateData.old_score_listening = parseFloat(document.getElementById('editOldListening').value) || 0;
            updateData.old_score_speaking = parseFloat(document.getElementById('editOldSpeaking').value) || 0;
            updateData.old_score_writing = parseFloat(document.getElementById('editOldWriting').value) || 0;
            updateData.old_score_total = parseFloat(document.getElementById('editOldTotal').value) || 0;
            
            // 개정후 성적 초기화
            updateData.current_level_reading = null;
            updateData.current_level_listening = null;
            updateData.current_level_speaking = null;
            updateData.current_level_writing = null;
            updateData.current_total_level = null;
        } else if (scoreType === 'new') {
            updateData.current_level_reading = parseFloat(document.getElementById('editNewReading').value) || 0;
            updateData.current_level_listening = parseFloat(document.getElementById('editNewListening').value) || 0;
            updateData.current_level_speaking = parseFloat(document.getElementById('editNewSpeaking').value) || 0;
            updateData.current_level_writing = parseFloat(document.getElementById('editNewWriting').value) || 0;
            updateData.current_total_level = parseFloat(document.getElementById('editNewTotal').value) || 0;
            
            // 개정전 성적 초기화
            updateData.old_score_reading = null;
            updateData.old_score_listening = null;
            updateData.old_score_speaking = null;
            updateData.old_score_writing = null;
            updateData.old_score_total = null;
        }
    } else {
        // 점수 삭제
        updateData.current_score_type = null;
        updateData.old_score_reading = null;
        updateData.old_score_listening = null;
        updateData.old_score_speaking = null;
        updateData.old_score_writing = null;
        updateData.old_score_total = null;
        updateData.current_level_reading = null;
        updateData.current_level_listening = null;
        updateData.current_level_speaking = null;
        updateData.current_level_writing = null;
        updateData.current_total_level = null;
    }
    
    // 목표 점수 - 합격 커트라인
    updateData.target_cutoff_total = parseFloat(document.getElementById('editTargetCutoffTotal').value) || 5.0;
    
    // 섹션별 커트라인
    const enableSectionCutoff = document.getElementById('editEnableSectionCutoff').checked;
    if (enableSectionCutoff) {
        updateData.target_cutoff_reading = parseFloat(document.getElementById('editTargetCutoffReading').value) || null;
        updateData.target_cutoff_listening = parseFloat(document.getElementById('editTargetCutoffListening').value) || null;
        updateData.target_cutoff_speaking = parseFloat(document.getElementById('editTargetCutoffSpeaking').value) || null;
        updateData.target_cutoff_writing = parseFloat(document.getElementById('editTargetCutoffWriting').value) || null;
    } else {
        updateData.target_cutoff_reading = null;
        updateData.target_cutoff_listening = null;
        updateData.target_cutoff_speaking = null;
        updateData.target_cutoff_writing = null;
    }
    
    // 개인 희망 점수
    const enablePersonalTarget = document.getElementById('editEnablePersonalTarget').checked;
    updateData.target_personal_enabled = enablePersonalTarget;
    
    if (enablePersonalTarget) {
        const personalMode = document.getElementById('editPersonalTargetMode').value;
        updateData.target_personal_type = personalMode;
        
        if (personalMode === 'total') {
            updateData.target_personal_total = parseFloat(document.getElementById('editTargetPersonalTotal').value) || null;
            updateData.target_personal_reading = null;
            updateData.target_personal_listening = null;
            updateData.target_personal_speaking = null;
            updateData.target_personal_writing = null;
        } else {
            updateData.target_personal_reading = parseFloat(document.getElementById('editTargetPersonalReading').value) || null;
            updateData.target_personal_listening = parseFloat(document.getElementById('editTargetPersonalListening').value) || null;
            updateData.target_personal_speaking = parseFloat(document.getElementById('editTargetPersonalSpeaking').value) || null;
            updateData.target_personal_writing = parseFloat(document.getElementById('editTargetPersonalWriting').value) || null;
            
            // 평균 계산
            const values = [
                updateData.target_personal_reading,
                updateData.target_personal_listening,
                updateData.target_personal_speaking,
                updateData.target_personal_writing
            ].filter(v => v !== null && v > 0);
            
            if (values.length > 0) {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                updateData.target_personal_total = Math.round(avg * 2) / 2;
            }
        }
    } else {
        updateData.target_personal_total = null;
        updateData.target_personal_reading = null;
        updateData.target_personal_listening = null;
        updateData.target_personal_speaking = null;
        updateData.target_personal_writing = null;
    }
    
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
    
    document.getElementById('editPayment').value = currentStudent.deposit_amount || 0;
    
    document.getElementById('editReview').checked = currentStudent.review_submitted || false;
    document.getElementById('editSettlement').checked = currentStudent.payment_completed || false;
    
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
        deposit_amount: parseFloat(document.getElementById('editPayment').value) || 0,
        review_submitted: document.getElementById('editReview').checked,
        payment_completed: document.getElementById('editSettlement').checked
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

