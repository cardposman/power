(() => {
  'use strict';

  // Directory URLs work on the web; local file previews need an explicit file.
  if (location.protocol === 'file:') {
    document.querySelectorAll('a[href]').forEach((link) => {
      const url = new URL(link.getAttribute('href'), location.href);
      if (url.protocol === 'file:' && url.pathname.endsWith('/')) {
        url.pathname += 'index.html';
        link.href = url.href;
      }
    });
  }

  const courses = {
    basic: {
      category: '처음 시작하는 일본어',
      title: ['히라가나부터,', '탄탄한 첫걸음.'],
      description: '글자와 발음부터 필수 회화와 문법까지. 일러스트와 단계별 교재를 따라 일본어의 기초를 차근차근 쌓아갑니다.',
      book: '일본어뱅크 다이스키',
      points: ['히라가나·가타카나와 기초 표현', '회화·문법·독해·작문·한자 학습', 'STEP 1–4로 이어지는 단계별 구성'],
      fit: '추천 대상 · 일본어를 처음 배우거나 기초부터 다시 정리하고 싶은 분',
      cta: '기초 일본어 상담접수'
    },
    conversation: {
      category: '일상에 가까운 일본어',
      title: ['알고 있던 표현을,', '말할 수 있는 한마디로.'],
      description: '그림과 간결한 문장으로 생활 속 표현을 익힙니다. 입문부터 고급까지, 일상에서 쓰이는 일본어 회화를 단계별로 살펴봅니다.',
      book: 'NEW 와꾸와꾸 일본어',
      points: ['그림으로 이해하는 생활 일본어', '쉽고 간결한 문장 중심의 회화', '입문·초급·중급·고급의 단계별 구성'],
      fit: '추천 대상 · 생활 속 일본어 표현을 배우고 말하기를 연습하고 싶은 분',
      cta: '생활회화 상담접수'
    },
    jlpt: {
      category: '목표를 향한 일본어',
      title: ['나의 목표 급수에 맞춰,', 'JLPT 준비도 차근차근.'],
      description: '문자, 어휘, 문법, 독해, 청해를 영역별로 준비합니다. 목표 급수와 현재 수준을 바탕으로 필요한 학습 방향을 상담합니다.',
      book: '야금야금 JLPT',
      points: ['N5·N4부터 N3·N2·N1까지', '문자·어휘·문법·독해·청해 학습', '시험 형식에 맞춘 문제 연습'],
      fit: '추천 대상 · 진학, 취업 또는 개인 목표로 JLPT를 준비하는 분',
      cta: 'JLPT 과정 상담접수'
    },
    business: {
      category: '일하는 나를 위한 일본어',
      title: ['일의 현장에서,', '더 정확하고 자연스럽게.'],
      description: '실무 상황에서 사용하는 표현과 경어를 배웁니다. 장면별 회화와 역할극, 일본의 비즈니스 문화를 함께 익히는 과정입니다.',
      book: 'OK! 비즈니스 일본어 회화',
      points: ['28가지 비즈니스 실전 장면', '경어: 경양어·존경어 표현 연습', '역할극과 비즈니스 문화 학습'],
      fit: '추천 대상 · 초급 이상의 일본어 학습자 중 실무 일본어가 필요한 분',
      cta: '비즈니스 일본어 상담접수'
    }
  };

  const tabs = [...document.querySelectorAll('[data-course]')];
  const panel = document.getElementById('course-panel');
  function selectCourse(tab, moveFocus = false) {
    const course = courses[tab.dataset.course];
    if (!course) return;
    tabs.forEach((item) => {
      item.setAttribute('aria-selected', String(item === tab));
      item.tabIndex = item === tab ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tab.id);
    panel.dataset.tone = tab.dataset.course;
    document.getElementById('course-category').textContent = course.category;
    const title = document.getElementById('course-title');
    title.replaceChildren(document.createTextNode(course.title[0]), document.createElement('br'), document.createTextNode(course.title[1]));
    document.getElementById('course-description').textContent = course.description;
    document.getElementById('course-book').textContent = course.book;
    document.getElementById('course-points').replaceChildren(...course.points.map((point) => {
      const item = document.createElement('li');
      item.textContent = point;
      return item;
    }));
    document.getElementById('course-fit').textContent = course.fit;
    document.getElementById('course-cta').textContent = course.cta;
    if (moveFocus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectCourse(tab));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        selectCourse(tabs[next], true);
      }
    });
  });

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-nav');
  function closeMenu() {
    nav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '메뉴 열기');
  }
  menuButton.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });
  nav.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) closeMenu();
  });

})();
