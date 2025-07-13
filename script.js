// DOM 요소들
const mealDateInput = document.getElementById('mealDate');
const searchBtn = document.getElementById('searchBtn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const mealInfoDiv = document.getElementById('mealInfo');
const mealDateTitle = document.getElementById('mealDateTitle');
const breakfastDiv = document.getElementById('breakfast');
const lunchDiv = document.getElementById('lunch');
const dinnerDiv = document.getElementById('dinner');
const errorMessage = document.getElementById('errorMessage');

// API 설정
const API_BASE_URL = 'https://open.neis.go.kr/hub/mealServiceDietInfo';
const SCHOOL_CODE = '7531100'; // 학교 코드
const OFFICE_CODE = 'J10'; // 교육청 코드

// 페이지 로드 시 오늘 날짜로 설정
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    mealDateInput.value = todayString;
});

// 검색 버튼 클릭 이벤트
searchBtn.addEventListener('click', function() {
    const selectedDate = mealDateInput.value;
    if (!selectedDate) {
        showError('날짜를 선택해주세요.');
        return;
    }
    
    fetchMealInfo(selectedDate);
});

// Enter 키 이벤트
mealDateInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

// 급식정보 API 호출
async function fetchMealInfo(date) {
    showLoading();
    hideError();
    hideMealInfo();
    
    try {
        // 날짜 형식을 YYYYMMDD로 변환
        const formattedDate = date.replace(/-/g, '');
        
        const url = `${API_BASE_URL}?ATPT_OFCDC_SC_CODE=${OFFICE_CODE}&SD_SCHUL_CODE=${SCHOOL_CODE}&MLSV_YMD=${formattedDate}`;
        
        console.log('API 호출 URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // XML 응답을 텍스트로 받기
        const xmlText = await response.text();
        console.log('XML 응답:', xmlText);
        
        // XML을 파싱하여 데이터 처리
        const data = parseXMLResponse(xmlText);
        processMealData(data, date);
        
    } catch (error) {
        console.error('API 호출 오류:', error);
        hideLoading();
        
        if (error.message === 'XML 파싱 오류') {
            showError('서버 응답을 처리하는 중 오류가 발생했습니다.');
        } else if (error.message === '급식정보를 찾을 수 없습니다.') {
            showError('급식정보를 찾을 수 없습니다.');
        } else {
            showError('급식정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
    }
}

// XML 응답 파싱 함수
function parseXMLResponse(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // 에러 체크
    const parserError = xmlDoc.getElementsByTagName("parsererror");
    if (parserError.length > 0) {
        throw new Error('XML 파싱 오류');
    }
    
    // RESULT 정보 확인
    const resultElement = xmlDoc.getElementsByTagName("RESULT")[0];
    if (resultElement) {
        const codeElement = resultElement.getElementsByTagName("CODE")[0];
        const messageElement = resultElement.getElementsByTagName("MESSAGE")[0];
        
        if (codeElement && codeElement.textContent === 'INFO-200') {
            return {
                RESULT: {
                    CODE: 'INFO-200',
                    MESSAGE: messageElement ? messageElement.textContent : '데이터가 없습니다.'
                }
            };
        }
    }
    
    // 급식정보 파싱
    const mealServiceDietInfo = xmlDoc.getElementsByTagName("mealServiceDietInfo")[0];
    if (!mealServiceDietInfo) {
        throw new Error('급식정보를 찾을 수 없습니다.');
    }
    
    const rows = mealServiceDietInfo.getElementsByTagName("row");
    const mealData = [];
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const mealInfo = {};
        
        // 각 필드 추출
        const fields = ['MMEAL_SC_CODE', 'DDISH_NM', 'MLSV_YMD', 'MLSV_FGR'];
        fields.forEach(field => {
            const element = row.getElementsByTagName(field)[0];
            if (element) {
                mealInfo[field] = element.textContent;
            }
        });
        
        mealData.push(mealInfo);
    }
    
    return {
        mealServiceDietInfo: [null, { row: mealData }]
    };
}

// 급식 데이터 처리
function processMealData(data, date) {
    hideLoading();
    
    // API 응답 구조 확인
    if (data.RESULT && data.RESULT.CODE === 'INFO-200') {
        showError('해당 날짜의 급식정보가 없습니다.');
        return;
    }
    
    if (!data.mealServiceDietInfo || !data.mealServiceDietInfo[1] || !data.mealServiceDietInfo[1].row) {
        showError('급식정보를 찾을 수 없습니다.');
        return;
    }
    
    const mealData = data.mealServiceDietInfo[1].row;
    displayMealInfo(mealData, date);
}

// 급식정보 표시
function displayMealInfo(mealData, date) {
    // 날짜 제목 설정
    const dateObj = new Date(date);
    const formattedDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
    mealDateTitle.textContent = `${formattedDate} 급식정보`;
    
    // 급식 데이터 초기화
    breakfastDiv.innerHTML = '';
    lunchDiv.innerHTML = '';
    dinnerDiv.innerHTML = '';
    
    // 급식 정보 분류
    const breakfast = [];
    const lunch = [];
    const dinner = [];
    
    mealData.forEach(meal => {
        const mealType = meal.MMEAL_SC_CODE; // 1: 조식, 2: 중식, 3: 석식
        const mealContent = meal.DDISH_NM;
        
        switch(mealType) {
            case '1':
                breakfast.push(mealContent);
                break;
            case '2':
                lunch.push(mealContent);
                break;
            case '3':
                dinner.push(mealContent);
                break;
        }
    });
    
    // 급식 정보 표시
    displayMealType(breakfastDiv, breakfast, '조식');
    displayMealType(lunchDiv, lunch, '중식');
    displayMealType(dinnerDiv, dinner, '석식');
    
    showMealInfo();
}

// 급식 타입별 표시
function displayMealType(container, meals, mealTypeName) {
    if (meals.length === 0) {
        container.innerHTML = `<div class="no-meal">${mealTypeName} 정보가 없습니다.</div>`;
        return;
    }
    
    meals.forEach(meal => {
        // 급식 메뉴를 개별 항목으로 분리
        const menuItems = meal.split('<br/>').filter(item => item.trim());
        
        menuItems.forEach(item => {
            const trimmedItem = item.trim();
            if (trimmedItem) {
                const menuElement = document.createElement('p');
                menuElement.textContent = trimmedItem;
                container.appendChild(menuElement);
            }
        });
    });
}

// 로딩 표시
function showLoading() {
    loadingDiv.classList.remove('hidden');
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
}

// 에러 표시
function showError(message) {
    errorMessage.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    errorDiv.classList.add('hidden');
}

// 급식정보 표시
function showMealInfo() {
    mealInfoDiv.classList.remove('hidden');
}

function hideMealInfo() {
    mealInfoDiv.classList.add('hidden');
}

// 날짜 유효성 검사
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// 오늘 날짜 이전 날짜 선택 방지
mealDateInput.addEventListener('change', function() {
    const selectedDate = new Date(this.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showError('오늘 날짜 이후의 급식정보만 조회 가능합니다.');
        this.value = today.toISOString().split('T')[0];
    }
});
