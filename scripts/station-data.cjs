const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./site-data.cjs');
const { stationRoute } = require('./page-routes.cjs');

const stationSource = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/stations.json'), 'utf8'));

// Shared guidance describes the product, not unverified local demand or facilities.
const guides = {
  work: {
    heading: '일과 함께 이어갈 일본어',
    description: '일상회화와 업무 표현 중 필요한 내용을 구분하고, 현재 수준과 희망 시간에 맞는 1:1 화상수업을 상담하세요.',
    paragraph: '일본어를 일에 활용하고 싶다면 지금 필요한 장면부터 정리해보세요. 짧은 자기소개와 일상 대화가 먼저인지, 전화 응대나 업무 상황의 경어가 필요한지에 따라 살펴볼 과정이 다릅니다. 글자를 읽을 수 있는지, 간단한 문장을 말할 수 있는지와 함께 실제로 연습하고 싶은 상황을 알려주세요. 기초가 필요한 경우와 비즈니스 표현을 다듬는 경우를 구분해 상담할 수 있습니다.',
    comparison: '일상회화는 친숙한 주제로 묻고 답하는 표현을, 비즈니스 회화는 업무 상황과 상대에 맞는 표현을 살펴보는 과정입니다. 회사에서 일본어를 쓴다는 이유만으로 어려운 업무 표현부터 시작할 필요는 없습니다.',
    prompts: ['일본어가 필요한 업무 장면 또는 일상 주제', '현재 읽기·듣기·말하기에서 편한 부분과 어려운 부분', '다른 일정과 함께 고려할 희망 수업 시간'],
    question: '기초가 부족한데 업무 일본어부터 배워야 하나요?',
    answer: '업무에 필요한 표현이 목표이더라도 글자와 기본 문장부터 확인할 수 있습니다. 현재 수준과 실제 사용 상황을 알려주시면 기초 과정과 비즈니스 과정 중 어디에서 시작할지 상담할 수 있습니다.'
  },
  campus: {
    heading: '회화와 시험, 목표부터 분명하게',
    description: '말하기 연습과 JLPT 준비의 차이를 살펴보고, 학습 경험과 목표에 맞는 일본어 1:1 화상수업을 상담하세요.',
    paragraph: '일본어로 대화하고 싶은 마음과 시험을 준비하려는 목표는 필요한 공부가 같지 않을 수 있습니다. 읽어서 이해하는 문장을 직접 말할 수 있는지, 듣고 답하는 데 어려움이 있는지부터 살펴보세요. 자격증이 필요하다면 목표 급수와 응시 계획을 함께 알려주세요. 회화와 JLPT 과정의 내용을 비교하고, 학업이나 다른 일정과 병행할 수 있는 방향을 상담해보세요.',
    comparison: '생활회화는 상황에 맞춰 말하고 답하는 연습에, JLPT 과정은 목표 급수의 문자·어휘·문법·독해·청해 학습에 초점을 둡니다. 시험 대비만으로 대화 연습이 모두 채워진다고 가정하지 않고 원하는 학습 내용을 확인하는 것이 좋습니다.',
    prompts: ['회화와 자격증 중 먼저 이루고 싶은 목표', '공부해본 교재·기간과 JLPT 응시 경험', '목표 시점과 병행해야 할 학업·개인 일정'],
    question: 'JLPT 준비와 말하기 연습을 함께 상담해도 되나요?',
    answer: '네. 두 목표를 함께 알려주셔도 됩니다. 다만 시험 대비와 말하기 연습은 학습 내용이 다르므로, 목표 급수와 현재 수준을 바탕으로 필요한 과정과 병행 가능 여부를 상담에서 확인해주세요.'
  },
  routine: {
    heading: '생활 일정에 맞춰 준비하는 일본어',
    description: '기초부터 다시 배우거나 생활회화를 시작하려는 분을 위한 일본어 상담 안내입니다. 수업은 1:1 화상 방식으로 진행합니다.',
    paragraph: '꾸준히 일본어를 배우고 싶다면 목표와 함께 평소의 학습 여건도 살펴보세요. 글자를 처음 배우는지, 예전에 공부한 문법을 다시 정리하고 싶은지, 짧은 대화를 이어가고 싶은지에 따라 출발점이 달라집니다. 수업에 참여할 수 있는 공간과 희망 시간을 정리하고, 무리 없이 병행하고 싶은 다른 일정도 함께 알려주세요. 구체적인 수업 시간과 진행 조건은 상담에서 확인할 수 있습니다.',
    comparison: '화상수업은 교실로 이동하는 대신 인터넷이 연결되고 대화할 수 있는 공간이 필요합니다. 집이라는 이유만으로 어디서나 편하게 수업할 수 있다고 가정하기보다 소음, 접속 환경, 집중할 시간을 먼저 확인해보세요.',
    prompts: ['처음 학습인지 재시작인지와 가장 배우고 싶은 내용', '대화할 수 있는 공간과 인터넷 접속 환경', '가능한 요일·시간 및 일정 협의가 필요한 부분'],
    question: '희망 시간만 정해두고 상담을 신청해도 되나요?',
    answer: '네. 가능한 요일과 시간을 남기고 현재 학습 경험을 함께 알려주세요. 희망 시간의 실제 수업 가능 여부와 진행 조건은 상담에서 확인해야 하며, 모든 시간대가 제공된다는 뜻은 아닙니다.'
  },
  conversation: {
    heading: '아는 표현을 대화로 연결하기',
    description: '읽기는 되지만 말하기가 어렵거나 생활회화를 시작하려는 분께, 현재 수준과 사용 목적에 맞는 1:1 화상수업을 안내합니다.',
    paragraph: '단어는 알아도 말이 바로 나오지 않는다면, 어떤 대화에서 막히는지부터 떠올려보세요. 나를 소개하는 말, 식사나 쇼핑에서 묻고 답하는 표현, 여행 중 요청하고 확인하는 말처럼 구체적인 상황이 도움이 됩니다. 처음부터 기초를 배워야 하는지, 배운 내용을 실제 문장으로 연결하는 연습이 필요한지 학습 경험과 함께 알려주세요. 생활회화 과정에서 살펴볼 내용을 상담할 수 있습니다.',
    comparison: '읽으면 이해하는 것과 상대의 말을 듣고 답하는 것은 다를 수 있습니다. 문법을 더 공부하는 것만을 목표로 삼기보다, 알고 있는 표현으로 짧게라도 묻고 답할 수 있는지 확인해보세요. 학습 수준에 따라 기초와 회화 중 필요한 출발점이 달라집니다.',
    prompts: ['일본어를 사용해보고 싶은 대화 상황', '글자 읽기·듣기·말하기의 현재 학습 경험', '여행 등 목표 시점과 희망 수업 시간'],
    question: '여행에서 쓸 표현을 중심으로 상담할 수 있나요?',
    answer: '사용하고 싶은 상황을 구체적으로 알려주세요. 생활회화 과정과 현재 수준을 바탕으로 필요한 내용을 상담할 수 있습니다. 여행 일정만으로 특정 기간 안의 실력 향상이나 맞춤 과정 개설을 보장하지는 않습니다.'
  },
  basic: {
    heading: '처음 배우는 일본어의 출발점',
    description: '히라가나부터 기초를 쌓고 싶은 분을 위한 일본어 1:1 화상수업 안내입니다. 학습 경험과 목표를 바탕으로 상담하세요.',
    paragraph: '일본어를 처음 시작한다면 글자와 발음, 간단한 문장 중 어디까지 익숙한지부터 알려주세요. 히라가나와 가타카나를 읽는 연습이 필요한 경우와 기본 표현을 배웠지만 문장으로 이어가기 어려운 경우는 출발점이 다릅니다. 처음 배우는 분뿐 아니라 오래 쉬었다가 다시 공부하려는 분도 이전에 사용한 교재와 학습 경험을 함께 남겨주세요. 기초 과정에서 확인할 내용을 상담할 수 있습니다.',
    comparison: '기초를 다시 배운다고 모든 내용을 처음부터 반복해야 하는 것은 아닙니다. 글자, 발음, 기본 문장 중 편한 부분과 어려운 부분을 구분하면 상담할 내용을 더 구체적으로 정리할 수 있습니다. 실제 시작 과정은 현재 수준을 확인한 뒤 안내합니다.',
    prompts: ['글자 읽기와 기본 문장을 공부해본 경험', '처음 시작하거나 다시 공부하려는 이유', '생활회화·시험 등 이후에 이루고 싶은 목표'],
    question: '오래전에 조금 배웠어도 기초 과정부터 상담할 수 있나요?',
    answer: '네. 이전에 공부한 내용과 지금 기억나는 부분을 알려주세요. 배운 기간만으로 수준을 정하기보다 글자와 기본 표현의 현재 이해도를 바탕으로 시작할 과정을 상담할 수 있습니다.'
  }
};

const stations = stationSource.stations.map((station) => {
  if (!Object.hasOwn(guides, station.guide) || !/^[a-z]+(?:-[a-z]+)*$/.test(station.regionSlug) || !Number.isInteger(station.id) || station.id < 1 || station.id > 200) throw new Error(`Invalid station: ${station.id}`);
  const name = station.name.endsWith('역') ? station.name : `${station.name}역`;
  const key = `${station.regionSlug}/${String(station.id).padStart(3, '0')}`;
  return { ...station, displayName: name, label: `${station.regionLabel} ${name}`, key, ...stationRoute(station.id), legacyFile: `station/${key}/index.html`, legacyUrl: `/station/${key}/`, content: guides[station.guide] };
});
if (stations.length !== 200 || new Set(stations.map((station) => station.id)).size !== 200 || new Set(stations.map((station) => station.key)).size !== 200) throw new Error('Expected 200 unique stations');

const stationGroups = [...new Set(stations.map((station) => station.regionSlug))].map((slug) => ({
  slug, label: stations.find((station) => station.regionSlug === slug).regionLabel,
  stations: stations.filter((station) => station.regionSlug === slug)
}));

module.exports = { stationSource, stations, stationGroups, guides };
