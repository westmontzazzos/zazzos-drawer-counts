# Zazzo's Drawer Counts: project notes

## Who you're working with
Ely owns Zazzo's (pizza + bar) in Darien and Westmont. He is not technical, works from his iPhone, and wants short, plain answers with no jargon. He dictates, so words come out garbled ("Westlawn" / "West Point" = Westmont). His name is spelled E-L-Y.

## What this is
One app for counting cash drawers at both stores. It is a single file (index.html, no build step), hosted on Netlify, saving to Supabase.
- Code: github.com/westmontzazzos/zazzos-drawer-counts (public). Files: index.html (the app), apple-touch-icon.png + icon-192/512.png, manifest.webmanifest, README.md.
- Netlify: the site is NOT created yet. Ely does one click-through: app.netlify.com/start, choose GitHub, pick the repo, Deploy. After that every push to main deploys itself.
- Database: Supabase project bkrgefddyculihfdhjwb (shared with Ely's other apps). The app uses the public anon key that is inside index.html. That key can read and write rows but CANNOT create tables, so a new table means giving Ely exact copy-ready SQL to paste into the Supabase SQL editor.
- Tables: darien_drawer_counts (exists; history since Aug 15, 2026; also used by the Drawer Count tab in the old Darien schedule app, so counts and edits show up in both) and westmont_drawer_counts (NOT created yet). He still needs to run:
    create table if not exists public.westmont_drawer_counts (like public.darien_drawer_counts including all);
    grant select, insert on public.westmont_drawer_counts to anon;
    grant usage, select on all sequences in schema public to anon;
- One row = one count. Columns: id, register, count_type (opener | shift_change | closer | spot_check), count_date (the BUSINESS day), cashier_name, counted_by, counted_at, counts_json (text: coins/rolls/bills quantities, tipout, edits), total, starting_balance, pull_amount, pos_expected, pos_variance.

## Stores and drawers
- Darien (table darien_drawer_counts): Cashier (= drawer 2, starts at $250), Bar (= station 7, $250), Safe (target $525). Old history also contains "Cashier 1" (= Cashier) and "Cashier 2" (retired); the app maps these for display.
- Westmont (table westmont_drawer_counts): Cashier 5 ($250), Cashier 8 ($250), Driver 2 ($300), Bar 9 ($250), Bar 12 ($250), Safe (target $500).

## How the app works
- Home screen, two tiles. DRAWER COUNT: open to anyone, a plain calculator (coins, coin rolls, dollars, total), nothing saved. STORES: locked with a PIN (re-locks whenever you return to the home screen); inside, Select a store (Darien / Westmont).
- A store's home shows one card per drawer with its status. Tap a drawer: the first count of the day is automatically an Open. After that: Shift Change or Close (as many shift changes as needed), See Counts, Spot Check (count and record only). The Safe only has Open and Close (+ See Counts). A drawer already closed asks before adding a correction Close.
- Bars (Shift Change / Close): a checklist first. Close out the bartender, close out the bar, then Count. The staff pay the bartender BEFORE counting, so the tip-out box is recorded only and is NEVER subtracted.
- Math. Pull = count minus the drawer's opening amount. POS check = count minus the POS figure (Shift Change / Close, not the Safe). Safe = count against its target.
- Business day: ends at 4am local time. A Close at 12:30am files under the previous day.
- Name only: whoever counts types their name. No PIN to count.
- Unsaved counts are kept per drawer on the phone (localStorage zdc_drafts_v1) until saved or discarded, even if the app closes or he looks at another drawer or the calendar.
- History: calendar (green = fully closed, amber = still open, gray = no data) -> day -> drawer -> count -> full breakdown. Discrepancies screen: every count where the POS check or the safe was off (7 / 30 / 90 days). Print Everything (Today): branded end-of-day report with a section per drawer, + / - per count, Drawer Net, End of Day Total.
- Editing a saved count needs the same PIN. The numbers it had before are kept on the count (counts_json.edits).
- Look: same as Ely's other apps (red #E31010, black #0D0D0D, Bebas Neue + DM Sans). Home-screen icon is the exact ZA icon his Inventory / Trucks / Big Prep apps use; suggested name "Drawer Counts".

## Working rules (hard-won)
1. Never say something is built, pushed or live until you have checked: the code is there, the commit is on GitHub, and Netlify shows the deploy ready for that commit. Earlier I said features were "built" that weren't, and he lost trust.
2. Test before every push (jsdom for the logic; headless Chrome screenshots at 390x844 for the look). Production once went blank on his phone after changes that passed desktop tests. After each push confirm the deploy is ready, tell him to close and reopen the app, and keep a rollback ready (restore index.html from the last good commit and push).
3. Do exactly what he asks. Don't remove, rename or add things he didn't ask for (he was upset when the Bar tip-out box was removed unasked, and when a table "lock" was proposed). If his instructions conflict, ask ONE short concrete question using his real numbers.
4. Money math: show it line by line with his real numbers; he checks it against his paperwork. Reference case, Bar shift change on Oct 30, 2026: count $311.60, POS $321, tip-out $117 -> pull +$61.60 and POS check $9.40 under. The old app subtracted the tip-out twice and showed -$126.40.
5. Tone: terse, plain, no jargon, own mistakes in one line. He gets very frustrated by long explanations, guessing, and repeated questions.

## Tools notes
- GitHub: Ely gives you a personal access token (account westmontzazzos, can create repos and push). It is not written here on purpose.
- Netlify tools: get-project (site -> current deploy id and state) then get-deploy (deploy id -> commit, state, published time). The sandbox cannot open netlify.app sites directly.
- A real headless Chrome works in the sandbox for screenshots: npm install @sparticuz/chromium puppeteer-core in a scratch folder.

## Open items
1. Ely runs the Westmont SQL above in Supabase (https://supabase.com/dashboard/project/bkrgefddyculihfdhjwb/sql/new).
2. Ely creates the Netlify site from the repo; then verify it is live, rename the site if wanted, and have him add it to his phone (Safari > Share > Add to Home Screen, name "Drawer Counts").
3. Test Westmont end to end with real counts once its table exists.
4. Only when Ely says so: remove the Drawer Count tab from the Darien schedule apps (repos westmontzazzos/darien-schedule-app and darien-new-look-staging).
5. The PIN is a convenience lock stored in the page's code (anyone who views the page source could find it), and the public key can write to the tables. Fine for now; mention it only if he asks about security.
