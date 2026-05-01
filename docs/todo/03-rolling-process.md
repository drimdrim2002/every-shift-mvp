## 결과를 누적하여 공정성을 확보한다

/Users/brown/workspace/every-shift-mvp/src/composables/useAISolver.ts

현재 ai solver 호출시에 해당 월의 데이터만 request를 생성하고 있다.
이전 데이터가 있는지 검토하고 있다면 이전 3개월 또는 해당 연도의 근무 배정 결과를 같이 request에 던져야 한다.
