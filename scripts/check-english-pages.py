"""Validate English production pages, references and subject separation offline."""
import argparse
import json
import runpy
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
Page = runpy.run_path(str(ROOT / 'scripts/check-generated.py'), run_name='validation')['Page']

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--directory', type=Path, default=ROOT)
    directory = parser.parse_args().directory.resolve()
    manifest = json.loads((directory / 'data/generated-pages.json').read_text(encoding='utf-8'))
    config = json.loads((ROOT / 'data/english.json').read_text(encoding='utf-8'))
    refs = json.loads((ROOT / 'data/english-places.json').read_text(encoding='utf-8'))
    areas = json.loads((ROOT / 'data/english-area-codes.json').read_text(encoding='utf-8'))['areas']
    entries = [entry for entry in manifest['pages'] if entry['kind'].startswith('english-')]
    assert len(entries) == 500
    assert Counter(entry['kind'] for entry in entries) == {'english-home':1, 'english-district':269, 'english-station':200, 'english-directory':1, 'english-province':16, 'english-station-directory':1, 'english-station-province':12}
    topics = Counter()
    paragraphs = set()
    headings = set()
    question_sets = set()
    copies = {}
    normalize = lambda value: re.sub(r'\W', '', value)
    for source in (ROOT / 'data/english-copy').glob('*.txt'):
        prefix = 'district' if source.name.startswith('regions-') else 'station'
        for line in source.read_text(encoding='utf-8').strip().splitlines():
            identifier, heading, body, questions = line.split('|')
            key = f'{prefix}-{identifier}'
            assert key not in copies, key
            copies[key] = (heading, body, questions.split('/'))
    assert len(copies) == 469
    for entry in entries:
        file = directory / entry['file']
        html = file.read_text(encoding='utf-8')
        page = Page(file)
        assert not any(word in html for word in ['TS재팬', 'JLPT', '히라가나', '무료 체험레슨', '52c74Jj4']), file
        counsel = [attrs for attrs in page.select('a') if attrs.get('href','').startswith('https://naver.me/')]
        assert all(attrs['href'] == config['counselUrl'] for attrs in counsel), file
        assert counsel, file
        if entry['kind'] not in {'english-home','english-district','english-station'}:
            assert len(page.select('li','data-region-item')) == entry['count'], file
            continue
        assert len(counsel) == 8, file
        assert len(page.select('img','data-english-poster')) == 6, file
        assert json.loads(''.join(page.text['course-data'])) == config['courses'], file
        assert len(page.select('button','data-course')) == 4, file
        assert len(page.select('details')) == 5, file
        if entry['kind'] == 'english-home':
            assert not entry['neighborhoods'], file
            continue
        assert entry['sourceFile'].startswith('english/'), file
        assert entry['deployFile'].startswith('en-reg-' if entry['kind'] == 'english-district' else 'en-st-'), file
        local = ''.join(page.text['local-guide'])
        assert entry['copyId'] in copies, file
        heading, body, questions = copies[entry['copyId']]
        assert page.ids['local-guide']['data-copy-id'] == entry['copyId'], file
        assert normalize(''.join(page.text['local-title'])) == normalize(heading), file
        assert body in local, file
        assert normalize(body) not in paragraphs, file
        assert normalize(heading) not in headings, file
        assert tuple(questions) not in question_sets, file
        assert all(question in local for question in questions), file
        paragraphs.add(normalize(body))
        headings.add(normalize(heading))
        question_sets.add(tuple(questions))
        assert local.count(entry['label']) == 1, file
        topics[entry['topic']] += 1
        ref = refs['districts'][entry['code']] if entry['kind'] == 'english-district' else refs['stations'][str(entry['stationId'])]
        assert entry['neighborhoods'] == [area['name'] for area in ref['neighborhoods']], file
        assert local.count('·'.join(entry['neighborhoods'])) == 1, file
        expected = 2 if entry.get('code') in {'26470','43745'} else 3
        assert len(set(entry['neighborhoods'])) == expected, file
        for area in ref['neighborhoods']:
            assert areas[area['code']] == area['fullName'], file
            assert area['fullName'].split()[-1] == area['name'], file
            assert area['name'] in local, (file,area['name'])
            if entry['kind'] == 'english-district':
                assert area['fullName'].startswith(ref['officialName']+' '), file
            else:
                assert area['referenceDistanceKm'] <= 8, file
        if entry.get('code') == '11170':
            assert entry['topic'] == 'individual'
            assert entry['neighborhoods'] == ['한남동','이촌동','후암동']
            assert entry['url'] == '/en-reg-yongsangu/'
        if entry.get('stationId') == 147:
            assert entry['url'] == '/en-st-seomyun/'
    assert topics == {'individual':469}
    assert len(paragraphs) == len(headings) == len(question_sets) == 469
    print(json.dumps({'englishPages':len(entries), 'uniqueBodiesWithoutPlaceNames':len(paragraphs), 'uniqueHeadings':len(headings), 'uniqueQuestionSets':len(question_sets), 'twoAreaExceptions':['연제구','증평군'], 'mode':manifest['mode']},ensure_ascii=False,indent=2))

if __name__ == '__main__':
    main()
