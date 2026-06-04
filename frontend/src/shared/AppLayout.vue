<template>
  <div class="app-frame">
    <header class="figma-nav app-shell-nav">
      <RouterLink class="figma-logo" to="/" aria-label="EZ One 메인">
        <strong>EZ-one</strong>
        <span>로고</span>
      </RouterLink>

      <nav class="figma-menu" aria-label="주요 메뉴">
        <RouterLink to="/basket">공고 장바구니</RouterLink>
        <RouterLink to="/document-profile">서류 입력 정보</RouterLink>
        <RouterLink to="/recommendations">추천 공고</RouterLink>
        <span class="figma-menu-disabled" aria-disabled="true">과거 지원 내역</span>
      </nav>

      <div class="figma-actions">
        <button type="button" class="figma-logout">로그아웃</button>
        <RouterLink class="figma-icon-action" to="/mypage" aria-label="마이페이지">
          <span class="user-icon" aria-hidden="true"></span>
          <small>마이페이지</small>
        </RouterLink>
        <button type="button" class="figma-icon-action" aria-label="알림">
          <span class="bell-icon" aria-hidden="true"></span>
          <small>알림</small>
        </button>
      </div>
    </header>

    <main class="app-main">
      <slot />
    </main>
  </div>
</template>
