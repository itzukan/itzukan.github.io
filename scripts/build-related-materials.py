"""Generate related lesson cards in individual pages for GitHub Pages."""

from html import escape
from html.parser import HTMLParser
from pathlib import Path
import argparse
import re

ROOT = Path(__file__).resolve().parents[1]
STYLE = '  <link rel="stylesheet" href="/assets/related-materials.css">'
START = '<!-- related-materials:start -->'
END = '<!-- related-materials:end -->'
MANUAL = 'topics/browser-cookie'

# Order similar lessons next to each other. Use full paths for cross-topic links.
GROUPS = {
    'HTTPキャッシュと配信': '''
        topics/cache-stale-screen topics/cdn-delivery network/cdn-cache
        network/round-robin topics/single-point-of-failure fe/cache-hit
    ''',
    'IP・DNS・接続': '''
        it-passport/dhcp-dns topics/fqdn-host-domain topics/private-dns
        fe/subnet-mask network/port-number network/firewall topics/network-boundary
    ''',
    '社内ネットワーク': '''
        topics/network-boundary topics/forward-proxy telework/vpn-youtube
        network/remote-desktop topics/bastion-session-manager
    ''',
    '回線・容量': '''
        telework/room-wifi telework/meeting-audio topics/mbps-and-megabytes
        topics/mb-and-mib topics/compression-formats
    ''',
    '認証とセッション': '''
        topics/browser-cookie topics/jwt-and-session fe-b-security/session-revoke
        topics/opaque-login it-passport/two-factor-auth
        telework/unexpected-approval fe-b-security/unexpected-mfa fe-b-security/suspicious-sign-in
    ''',
    'TLSとWebの安全': '''
        topics/public-wifi-and-https topics/https-and-fake-sites
        fe-b-security/certificate-warning topics/mutual-tls topics/certificate-bound-token
    ''',
    '認証と認可': '''
        topics/authentication-boundary topics/identity-provider topics/sso-saml-oauth
        topics/oauth-and-oidc topics/api-authentication api-key
        topics/api-keys-vs-iam-roles fe-b-security/exposed-api-key
    ''',
    'クラウドの認証': '''
        topics/api-keys-vs-iam-roles topics/aws-sts topics/iam-sts-sigv4
        topics/iam-roles-anywhere topics/bastion-session-manager
    ''',
    'クラウドの接続と保護': '''
        topics/private-dns topics/privatelink topics/s3-endpoint-types
        topics/s3-encryption-keys it-passport/hash-vs-encryption fe-b-security/download-integrity
    ''',
    'AWS実行環境': '''
        topics/lambda-or-containers topics/aws-ecs-eks topics/when-to-use-eks
        topics/aws-cross-region topics/aws-fis topics/single-point-of-failure
    ''',
    'Web API設計': '''
        topics/openapi topics/rest-graphql-grpc topics/protocol-buffers
        topics/sync-and-async-api topics/idempotency topics/exponential-backoff
    ''',
    '非同期連携': '''
        topics/sync-and-async-api topics/sqs-and-kinesis topics/kafka-rabbitmq-sqs
        topics/kinesis-and-firehose topics/idempotency topics/exponential-backoff
    ''',
    'ログ・監視': '''
        fe-b-security/log-timezones fe-b-security/log-export-hold
        fe-b-security/shared-admin-audit topics/detect-unusual-admin
        topics/correlation-id topics/opentelemetry topics/prevent-detect-recover
    ''',
    'テーブルとSQL': '''
        it-passport/primary-foreign-key it-passport/normalization fe/left-join
        sql/index-search-update topics/optimistic-concurrency-control topics/database-split
    ''',
    '分析基盤': '''
        topics/database-split topics/zero-copy-data topics/database-catalog
        topics/parquet-csv topics/snowflake-warehouse topics/redshift-snowflake-databricks
    ''',
    '生成AIとデータ': '''
        topics/corporate-ai-data topics/tenant-data-boundary topics/ontology
        topics/graph-rag topics/rag-fine-tuning topics/rag-and-tools
    ''',
    '開発の要件・設計': '''
        topics/as-is-to-be-gap topics/mvp topics/pm-pdm-pmo topics/internal-it-engineer
        topics/service-ownership-boundary topics/acceptance-criteria topics/ut-it-st-uat
        topics/feature-flag topics/spec-driven-development topics/architecture-decision-record
        topics/mermaid-diagrams
    ''',
    'AIと運用の手順': '''
        topics/spec-driven-development topics/agents-md-and-skills topics/runbook-and-skills
        topics/loop-engineering topics/acceptance-criteria
    ''',
    'PCとプログラム': '''
        it-passport/cpu-memory-storage topics/cpu-and-gpu topics/rust-python
        fe/bit-operations fe/cache-hit
    ''',
    '運用と可用性': '''
        it-passport/sla fe/availability-mtbf-mttr topics/single-point-of-failure
        it-passport/incident-problem topics/prevent-detect-recover
    ''',
    '経営・計画': '''
        it-passport/swot it-passport/kgi-kpi it-passport/break-even
        it-passport/project-schedule topics/as-is-to-be-gap
    ''',
    '検索とデータ構造': '''
        fe-b/first-match fe/binary-search fe-b/binary-boundary fe-b/insertion-position
        fe/stack-queue fe-b/stack-top fe-b/circular-queue fe/breadth-first-search
    ''',
    '配列を数える': '''
        fe-b/loop-sum fe-b/count-matches fe-b/sentinel-sum fe-b/adjacent-rise
        fe-b/longest-streak fe-b/array-frequency fe-b/nested-pairs
    ''',
    '配列・最大値': '''
        fe-b/scan-max fe-b/first-match fe-b/last-maximum fe-b/longest-streak
    ''',
    '配列を書き換える': '''
        fe-b/array-swap fe-b/reverse-copy fe-b/shift-right fe-b/filter-copy
        fe-b/merge-heads fe-b/select-first fe-b/bubble-pass
    ''',
    '累計と二次元配列': '''
        fe-b/prefix-total fe-b/range-sum fe-b/matrix-row-total fe-b/matrix-transpose
    ''',
    '関数と繰り返し': '''
        fe-b/function-return fe-b/function-in-loop fe-b/recursive-product
        fe-b/while-halving fe-b/gcd-remainder
    ''',
    'アカウントと権限': '''
        fe-b-security/cloud-app-permission fe-b-security/approval-separation
        fe-b-security/temporary-maintenance fe-b-security/offboarding-access
        fe-b-security/session-revoke fe-b-security/shared-admin-audit topics/zero-trust
    ''',
    '被害拡大と復旧': '''
        topics/prevent-detect-recover it-passport/security-cia
        fe-b-security/patch-priority topics/php2shell-defensive-response
        fe-b-security/isolate-device fe-b-security/backup-restore
        fe-b-security/restore-point fe-b-security/protect-backup-access
        fe-b-security/vendor-notice topics/rapid-credential-incident
    ''',
    '社外での判断': '''
        fe-b-security/payment-change fe-b-security/qr-phishing
        topics/https-and-fake-sites fe-b-security/unknown-usb
        fe-b-security/lost-laptop fe-b-security/disposed-device
    ''',
    '共有と持ち出し': '''
        telework/screen-sharing telework/work-files fe-b-security/wrong-recipient
        fe-b-security/share-permissions fe-b-security/public-share-incident
        fe-b-security/redact-document fe-b-security/synthetic-test-data
    ''',
    'Wi-Fiの利用': '''
        telework/vpn-youtube telework/room-wifi telework/meeting-audio
        topics/public-wifi-and-https fe-b-security/guest-wifi topics/zero-trust
    ''',
}

OVERRIDES = {
    'topics/jwt-and-session': [MANUAL, 'fe-b-security/session-revoke', 'topics/oauth-and-oidc'],
    'fe-b-security/session-revoke': ['topics/jwt-and-session', 'fe-b-security/offboarding-access', MANUAL],
    'telework/screen-sharing': ['telework/meeting-audio', 'telework/work-files', 'fe-b-security/share-permissions'],
    'telework/unexpected-approval': ['fe-b-security/unexpected-mfa', 'it-passport/two-factor-auth', 'fe-b-security/suspicious-sign-in'],
    'telework/meeting-audio': ['telework/room-wifi', 'telework/screen-sharing', 'topics/mbps-and-megabytes'],
    'network/round-robin': ['topics/single-point-of-failure', 'topics/cdn-delivery', 'network/cdn-cache'],
}


class Lesson(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.title = []
        self.description = ''
        self.material_id = ''
        self.reading_title = False
        self.feed(path.read_text(encoding='utf-8'))
        self.title = ' '.join(' '.join(self.title).split())
        if not self.title or not self.description:
            raise ValueError(f'Missing title or description in {path}')

    def handle_starttag(self, tag, attrs):
        fields = dict(attrs)
        if tag == 'h1' and not self.title:
            self.reading_title = True
        if tag == 'meta' and fields.get('name') == 'description':
            self.description = fields.get('content', '')
        if tag in ('body', 'main'):
            self.material_id = fields.get('data-material-id') or fields.get('data-feedback-material') or self.material_id

    def handle_data(self, data):
        if self.reading_title:
            self.title.append(data)

    def handle_endtag(self, tag):
        if tag == 'h1':
            self.reading_title = False


def related_pages():
    recommendations = {}
    for members in GROUPS.values():
        paths = members.split()
        if len(paths) < 4 or len(paths) != len(set(paths)):
            raise ValueError(f'Each group needs four distinct lessons: {paths}')
        for index, source in enumerate(paths):
            candidates = sorted((i for i in range(len(paths)) if i != index), key=lambda i: abs(i - index))
            recommendations.setdefault(source, [paths[i] for i in candidates[:3]])
    for source, targets in OVERRIDES.items():
        if source not in recommendations or len(set(targets)) != 3 or source in targets or set(targets) - recommendations.keys():
            raise ValueError(f'Invalid related lesson override for {source}: {targets}')
        recommendations[source] = targets
    return recommendations


def render(targets, lessons):
    lines = [
        f'    {START}',
        '    <section class="related-materials" aria-labelledby="related-title">',
        '      <h2 id="related-title">関連教材</h2>',
        '      <p class="related-swipe">横にスワイプして見る →</p>',
        '      <ul class="related-lessons">',
    ]
    for target in targets:
        lesson = lessons[target]
        analytics = (
            f' data-analytics-event="material_click" data-material-id="{escape(lesson.material_id)}"'
            ' data-click-location="related_lessons"' if lesson.material_id else ''
        )
        lines.extend([
            '        <li>',
            f'          <a href="/materials/{target}/"{analytics}>',
            f'            <strong>{escape(lesson.title)}</strong>',
            f'            <span>{escape(lesson.description)}</span>',
            '          </a>',
            '        </li>',
        ])
    lines.extend(['      </ul>', '    </section>', f'    {END}'])
    return '\n'.join(lines)


def insert_page(source, block):
    if source.count(START) != source.count(END) or source.count(START) > 1:
        raise ValueError('Unexpected related lesson markers')
    if STYLE not in source:
        source = source.replace('</head>', STYLE + '\n</head>', 1)
    if START in source:
        return re.sub(r'^[ \t]*' + re.escape(START) + r'.*?' + re.escape(END),
                      lambda _: block, source, count=1, flags=re.M | re.S)
    main_end = source.rindex('</main>')
    footer = source.find('<footer', source.index('<main'), main_end)
    insertion = main_end if footer == -1 else footer
    line_start = source.rfind('\n', 0, insertion) + 1
    if not source[line_start:insertion].strip():
        insertion = line_start
    return source[:insertion] + '\n' + block + '\n' + source[insertion:]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    recommendations = related_pages()
    lessons = {key: Lesson(ROOT / 'materials' / key / 'index.html') for key in recommendations}
    updates = []
    for key, targets in recommendations.items():
        if key == MANUAL:
            continue
        path = lessons[key].path
        before = path.read_text(encoding='utf-8')
        after = insert_page(before, render(targets, lessons))
        if STYLE not in after or after.count(START) != 1:
            raise ValueError(f'Could not insert related lessons into {path}')
        if before != after:
            updates.append((path, after))
    if args.check and updates:
        parser.exit(1, '\n'.join(str(path.relative_to(ROOT)) for path, _ in updates) + '\n')
    for path, content in updates:
        path.write_text(content, encoding='utf-8', newline='\n')
    print(f'{len(lessons)} individual lessons, {len(updates)} updated')


if __name__ == '__main__':
    main()
