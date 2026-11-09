const test = require('node:test');
const assert = require('node:assert/strict');
const { englishLocalContent, copyCount } = require('./english-local-content.cjs');
const { englishDistricts, englishStations } = require('./english-data.cjs');

const entries = [...englishDistricts,...englishStations];
const yongsan = englishDistricts.find(entry=>entry.pathCode === '11170');
const normalize = value => value.normalize('NFKC').replace(/[\p{P}\p{Z}\s]/gu,'');

test('all 469 pages own unique authored bodies, headings and question sets before place insertion', () => {
  assert.equal(copyCount,469);
  const copies = entries.map(entry=>englishLocalContent(entry,entry.neighborhoods));
  for (const select of [copy=>normalize(copy.body),copy=>normalize(copy.heading.join(' ')),copy=>normalize(copy.prompts.join(' ')),copy=>copy.id]) {
    assert.equal(new Set(copies.map(select)).size,469);
  }
  for (const [index,copy] of copies.entries()) {
    assert.equal(copy.topic,'individual');
    assert.equal(copy.variant,null);
    assert.equal(copy.prompts.length,3);
    assert(copy.body.length >= 70);
    assert(copy.paragraph.includes(copy.body));
    assert.equal(copy.paragraph.split(entries[index].label).length-1,1);
    assert.equal(copy.paragraph.split(entries[index].neighborhoods.join('·')).length-1,1);
    assert(copy.paragraph.includes('전화·화상수업'));
  }
});

test('the three reviewed pages have separate copy records and immutable return values', () => {
  const selected = [yongsan,englishDistricts.find(entry=>entry.pathCode==='28177'),...englishStations.filter(entry=>[78,200].includes(entry.id))];
  assert.equal(new Set(selected.map(entry=>englishLocalContent(entry,entry.neighborhoods).body)).size,4);
  const first = englishLocalContent(yongsan,yongsan.neighborhoods);
  assert.equal(first.id,'district-11170');
  first.heading.push('changed');
  first.prompts.push('changed');
  assert.equal(englishLocalContent(yongsan,yongsan.neighborhoods).prompts.length,3);
  assert.deepEqual(englishLocalContent(yongsan,yongsan.neighborhoods),englishLocalContent(yongsan,yongsan.neighborhoods));
});

test('missing copy and mismatched geography fail without a six-profile fallback', () => {
  for (const entry of [null,{}, {key:'',label:'지역'}]) assert.throws(()=>englishLocalContent(entry,yongsan.neighborhoods),/district/);
  for (const names of [undefined,[],['한남동'],['한남동','한남동','이촌동'],['한남동','이촌동',''],['한남동','이촌동',3]]) assert.throws(()=>englishLocalContent(yongsan,names),/neighborhood/);
  assert.throws(()=>englishLocalContent({key:'fixture/missing',label:'지역'},yongsan.neighborhoods),/Missing individual copy/);
  assert.throws(()=>englishLocalContent(yongsan,['이태원동','이촌동','한남동']),/place mismatch/);
});

test('authored bodies do not repeat with punctuation-only or small phrase edits', () => {
  const copies = entries.map(entry=>englishLocalContent(entry,entry.neighborhoods));
  const grams = text => {
    const value = normalize(text);
    return new Set(Array.from({length:Math.max(0,value.length-4)},(_,i)=>value.slice(i,i+5)));
  };
  const sets = copies.map(copy=>grams(copy.body));
  let maximum = 0;
  let pair;
  for (let i=0;i<sets.length;i++) for(let j=i+1;j<sets.length;j++) {
    const smaller = sets[i].size < sets[j].size ? sets[i] : sets[j];
    const larger = smaller === sets[i] ? sets[j] : sets[i];
    let intersection=0;
    for(const gram of smaller) if(larger.has(gram)) intersection++;
    const dice=2*intersection/(sets[i].size+sets[j].size);
    if(dice>maximum){maximum=dice;pair=[copies[i].id,copies[j].id];}
  }
  // A local copy-regression guard, not a search-engine classification model.
  assert(maximum<0.70,JSON.stringify({maximum,pair}));
  console.log(JSON.stringify({bodies:copies.length,maximumFiveCharacterDice:Number(maximum.toFixed(4)),pair,searchEnginePrediction:false}));
});
