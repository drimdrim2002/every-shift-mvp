# 백엔드 CORS 설정 가이드 (Quarkus)

## 문제 상황

프론트엔드(`http://localhost:5173`)에서 백엔드 API(`https://every-shift-api-service-554455861916.a.run.app`)를 호출할 때 다음과 같은 CORS 오류가 발생합니다:

```
Access to fetch at 'https://every-shift-api-service-554455861916.a.run.app/api/solve'
from origin 'http://localhost:5173' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## CORS란?

**CORS (Cross-Origin Resource Sharing)**는 브라우저 보안 정책으로, 다른 출처(origin)의 리소스에 접근할 때 서버가 명시적으로 허용해야 합니다.

- **Origin**: 프로토콜 + 도메인 + 포트의 조합
  - 예: `http://localhost:5173`, `https://every-shift.com`
- **Same-Origin**: 모든 요소가 동일한 경우
- **Cross-Origin**: 하나라도 다른 경우 (CORS 정책 적용)

## Quarkus에서 CORS 설정하기

### 방법 1: application.properties 설정 (권장)

Quarkus는 `application.properties` 파일에서 CORS를 간단하게 설정할 수 있습니다.

#### 파일 위치

```
src/main/resources/application.properties
```

#### 설정 예시

##### 개발 환경 (모든 출처 허용)

```properties
# CORS 설정 - 개발 환경
quarkus.http.cors=true
quarkus.http.cors.origins=http://localhost:5173,http://localhost:5174,http://localhost:3000
quarkus.http.cors.methods=GET,POST,PUT,DELETE,OPTIONS,PATCH
quarkus.http.cors.headers=accept,authorization,content-type,x-requested-with
quarkus.http.cors.exposed-headers=Content-Disposition
quarkus.http.cors.access-control-max-age=86400
quarkus.http.cors.access-control-allow-credentials=true
```

##### 프로덕션 환경 (특정 도메인만 허용)

```properties
# CORS 설정 - 프로덕션 환경
quarkus.http.cors=true
quarkus.http.cors.origins=https://every-shift.com,https://www.every-shift.com
quarkus.http.cors.methods=GET,POST,PUT,DELETE,OPTIONS,PATCH
quarkus.http.cors.headers=accept,authorization,content-type,x-requested-with
quarkus.http.cors.exposed-headers=Content-Disposition
quarkus.http.cors.access-control-max-age=86400
quarkus.http.cors.access-control-allow-credentials=true
```

##### 환경별 설정 분리 (권장)

```properties
# application.properties (공통)
quarkus.http.cors=true
quarkus.http.cors.methods=GET,POST,PUT,DELETE,OPTIONS,PATCH
quarkus.http.cors.headers=accept,authorization,content-type,x-requested-with
quarkus.http.cors.exposed-headers=Content-Disposition
quarkus.http.cors.access-control-max-age=86400
quarkus.http.cors.access-control-allow-credentials=true

# 개발 환경 (application-dev.properties)
%dev.quarkus.http.cors.origins=http://localhost:5173,http://localhost:5174

# 프로덕션 환경 (application-prod.properties)
%prod.quarkus.http.cors.origins=https://every-shift.com,https://www.every-shift.com
```

#### 설정 항목 설명

| 속성                                                 | 설명                          | 예시                          |
| ---------------------------------------------------- | ----------------------------- | ----------------------------- |
| `quarkus.http.cors`                                  | CORS 활성화 여부              | `true`                        |
| `quarkus.http.cors.origins`                          | 허용할 출처 (쉼표로 구분)     | `http://localhost:5173`       |
| `quarkus.http.cors.methods`                          | 허용할 HTTP 메서드            | `GET,POST,PUT,DELETE,OPTIONS` |
| `quarkus.http.cors.headers`                          | 허용할 요청 헤더              | `content-type,authorization`  |
| `quarkus.http.cors.exposed-headers`                  | 클라이언트에 노출할 응답 헤더 | `Content-Disposition`         |
| `quarkus.http.cors.access-control-max-age`           | Preflight 캐시 시간 (초)      | `86400` (24시간)              |
| `quarkus.http.cors.access-control-allow-credentials` | 인증 정보 포함 허용           | `true`                        |

### 방법 2: CorsFilter 직접 구현 (세밀한 제어 필요 시)

더 세밀한 제어가 필요한 경우 Filter를 직접 구현할 수 있습니다.

#### 파일 생성

```
src/main/java/com/everyshift/filter/CorsFilter.java
```

#### 코드 예시

```java
package com.everyshift.filter;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;

@Provider
public class CorsFilter implements ContainerResponseFilter {

    @Override
    public void filter(ContainerRequestContext requestContext,
                       ContainerResponseContext responseContext) throws IOException {

        // 개발 환경에서는 모든 출처 허용
        String origin = requestContext.getHeaderString("Origin");

        if (origin != null && isAllowedOrigin(origin)) {
            responseContext.getHeaders().add("Access-Control-Allow-Origin", origin);
            responseContext.getHeaders().add("Access-Control-Allow-Credentials", "true");
            responseContext.getHeaders().add("Access-Control-Allow-Headers",
                "origin, content-type, accept, authorization");
            responseContext.getHeaders().add("Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
            responseContext.getHeaders().add("Access-Control-Max-Age", "86400");
        }
    }

    private boolean isAllowedOrigin(String origin) {
        // 환경 변수나 설정 파일에서 허용 목록 읽기
        String allowedOrigins = System.getenv("ALLOWED_ORIGINS");
        if (allowedOrigins == null) {
            // 기본값: 개발 환경
            allowedOrigins = "http://localhost:5173,http://localhost:5174,http://localhost:3000";
        }

        return allowedOrigins.contains(origin);
    }
}
```

### 방법 3: Google Cloud Run 환경 변수 설정

Cloud Run에 배포된 경우 환경 변수로 허용 출처를 관리할 수 있습니다.

#### Cloud Run 콘솔에서 설정

1. Cloud Run 서비스 선택
2. "편집 및 새 버전 배포" 클릭
3. "변수 및 보안 비밀" 탭
4. 환경 변수 추가:
   ```
   ALLOWED_ORIGINS=http://localhost:5173,https://every-shift.com
   ```

#### gcloud CLI로 설정

```bash
gcloud run services update every-shift-api-service \
  --region=asia-northeast3 \
  --set-env-vars="ALLOWED_ORIGINS=http://localhost:5173,https://every-shift.com"
```

## 현재 프로젝트에 적용하기

### 1단계: application.properties 수정

현재 프로젝트의 `src/main/resources/application.properties` 파일에 다음 내용을 추가하세요:

```properties
# ========================================
# CORS 설정
# ========================================
quarkus.http.cors=true
quarkus.http.cors.methods=GET,POST,PUT,DELETE,OPTIONS,PATCH
quarkus.http.cors.headers=accept,authorization,content-type,x-requested-with
quarkus.http.cors.exposed-headers=Content-Disposition
quarkus.http.cors.access-control-max-age=86400
quarkus.http.cors.access-control-allow-credentials=true

# 개발 환경
%dev.quarkus.http.cors.origins=http://localhost:5173,http://localhost:5174,http://localhost:3000

# 프로덕션 환경 (실제 도메인으로 변경 필요)
%prod.quarkus.http.cors.origins=https://every-shift.com,https://www.every-shift.com
```

### 2단계: 로컬에서 테스트

```bash
# Quarkus 개발 모드로 실행
./mvnw quarkus:dev

# 또는 Gradle 사용 시
./gradlew quarkusDev
```

### 3단계: CORS 동작 확인

브라우저 개발자 도구(F12)의 Network 탭에서 확인:

1. **Preflight 요청 (OPTIONS)**
   - Request Headers에 `Origin: http://localhost:5173` 포함
   - Response Headers에 `Access-Control-Allow-Origin: http://localhost:5173` 포함

2. **실제 요청 (POST /api/solve)**
   - Response Headers에 `Access-Control-Allow-Origin` 포함
   - 오류 없이 정상 응답

### 4단계: Cloud Run에 배포

```bash
# Docker 이미지 빌드
./mvnw package -Dquarkus.container-image.build=true

# Cloud Run에 배포
gcloud run deploy every-shift-api-service \
  --image=asia-northeast3-docker.pkg.dev/every-shift-api/containers/hello-world-job:latest \
  --region=asia-northeast3 \
  --platform=managed \
  --allow-unauthenticated
```

## 보안 고려사항

### ⚠️ 주의사항

1. **와일드카드 사용 금지 (프로덕션)**

   ```properties
   # ❌ 절대 사용하지 마세요 (모든 출처 허용)
   quarkus.http.cors.origins=*
   ```

2. **특정 도메인만 허용**

   ```properties
   # ✅ 권장: 명시적으로 허용할 도메인 나열
   quarkus.http.cors.origins=https://every-shift.com,https://www.every-shift.com
   ```

3. **Credentials 사용 시 주의**
   - `access-control-allow-credentials=true`인 경우 와일드카드(`*`) 사용 불가
   - 반드시 명시적인 출처 지정 필요

### 권장 설정 (환경별)

#### 개발 환경

```properties
%dev.quarkus.http.cors.origins=http://localhost:5173,http://localhost:5174
%dev.quarkus.http.cors.access-control-allow-credentials=true
```

#### 스테이징 환경

```properties
%staging.quarkus.http.cors.origins=https://staging.every-shift.com
%staging.quarkus.http.cors.access-control-allow-credentials=true
```

#### 프로덕션 환경

```properties
%prod.quarkus.http.cors.origins=https://every-shift.com,https://www.every-shift.com
%prod.quarkus.http.cors.access-control-allow-credentials=true
```

## 문제 해결

### CORS 오류가 계속 발생하는 경우

1. **서버 재시작 확인**
   - `application.properties` 변경 후 서버를 재시작했는지 확인

2. **브라우저 캐시 삭제**
   - 개발자 도구 → Network 탭 → "Disable cache" 체크
   - 또는 시크릿 모드로 테스트

3. **Preflight 요청 확인**

   ```bash
   # OPTIONS 요청 테스트
   curl -X OPTIONS \
     -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: content-type" \
     -v \
     https://every-shift-api-service-554455861916.a.run.app/api/solve
   ```

4. **응답 헤더 확인**
   - `Access-Control-Allow-Origin` 헤더가 응답에 포함되어 있는지 확인
   - 값이 요청의 `Origin` 헤더와 일치하는지 확인

### 로그 확인

Quarkus 로그에서 CORS 관련 메시지 확인:

```bash
# 개발 모드에서 CORS 로그 활성화
quarkus.log.category."io.quarkus.http.runtime.cors".level=DEBUG
```

## 참고 자료

- [Quarkus CORS 공식 문서](https://quarkus.io/guides/http-reference#cors-filter)
- [MDN CORS 가이드](https://developer.mozilla.org/ko/docs/Web/HTTP/CORS)
- [Google Cloud Run CORS 설정](https://cloud.google.com/run/docs/configuring/cors)

## 요약 체크리스트

- [ ] `application.properties`에 CORS 설정 추가
- [ ] 개발 환경: `http://localhost:5173` 허용
- [ ] 프로덕션 환경: 실제 도메인만 허용
- [ ] 서버 재시작
- [ ] 브라우저에서 테스트 (Network 탭 확인)
- [ ] Preflight 요청(OPTIONS) 정상 응답 확인
- [ ] 실제 요청(POST) 정상 응답 확인
- [ ] Cloud Run에 배포 및 테스트

---

**작성일**: 2026-02-01  
**대상 프로젝트**: EveryShift API (Quarkus)  
**관련 이슈**: CORS 정책으로 인한 프론트엔드 API 호출 차단
