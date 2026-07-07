#!/usr/bin/env python3
"""
Idempotent provisioning for the One Day Investor Uptime Kuma instance:
creates the admin account (first run only), ensures every monitor exists, and
(re)builds the public status page.

Run against the instance's local port. On the server, the simplest way (this
Docker can't bind-mount from /opt, so pipe the script via stdin):

    PW=$(cat /opt/uptime-kuma/.admin-pass)
    docker run --rm -i --network host python:3.12-slim \
      sh -c "pip install --quiet uptime-kuma-api && python3 - '$PW'" < provision.py

Re-running is safe: existing monitors are matched by name and skipped.
"""
import sys
from uptime_kuma_api import UptimeKumaApi, MonitorType

URL = 'http://127.0.0.1:3011'
pw = sys.argv[1]

# (name, url, accepted_statuscodes or None)
TARGETS = [
    ('One Day Investor', 'https://odinvestor.net', None),
    ('Blog',             'https://blog.odinvestor.net', None),
    ('Dashboard',        'https://dashboard.odinvestor.net', None),
    ('Core API',         'https://core.odinvestor.net', None),
    ('Market API',       'https://market.odinvestor.net', None),
    ('Analytics API',    'https://analytics.odinvestor.net', None),
    ('Trade',            'https://trade.odinvestor.net', ['200-299', '300-399']),
]
SLUG = 'odinvestor'

api = UptimeKumaApi(URL)
try:
    api.setup('admin', pw); print('admin: created')
except Exception as e:
    print('admin exists:', str(e)[:60])
api.login('admin', pw)

existing = {m['name']: m['id'] for m in api.get_monitors()}
order = []
for name, url, codes in TARGETS:
    if name in existing:
        order.append(existing[name]); print('exists:', name); continue
    kw = dict(type=MonitorType.HTTP, name=name, url=url, interval=60, maxretries=2)
    if codes:
        kw['accepted_statuscodes'] = codes
    r = api.add_monitor(**kw)
    order.append(r['monitorID']); print('added:', name, '->', r['monitorID'])

try:
    api.add_status_page(SLUG, 'One Day Investor Status'); print('status page created')
except Exception as e:
    print('status page exists:', str(e)[:60])

mons = {m['id']: m for m in api.get_monitors()}
monitor_list = [mons[i] for i in order if i in mons]
api.save_status_page(
    SLUG,
    title='One Day Investor — Status',
    description='Live status of One Day Investor services',
    published=True,
    showTags=False,
    publicGroupList=[{'name': 'Services', 'monitorList': monitor_list}],
)
print('status page saved with %d monitors' % len(monitor_list))
api.disconnect()
print('DONE')
