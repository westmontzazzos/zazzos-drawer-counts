# Zazzo's Drawer Counts: project notes

## Who you're working with
Ely owns Zazzo's (pizza + bar) in Darien and Westmont. He is not technical, works from his iPhone, and wants short, plain answers with no jargon. He dictates, so words come out garbled: "Grubhub" = GitHub, "NetLiffy" = Netlify, "Supabay" = Supabase, "Westlawn" / "West Point" = Westmont. His name is spelled E-L-Y.

## The app (live)
https://bespoke-mousse-076142.netlify.app
One app for counting cash drawers at both stores. A single file (index.html, no build step) that saves to Supabase. Pushing to GitHub main deploys it automatically.

## ACCESS: you have everything you need. Try before you say you can't.
Ely expects you to claim you have no access, can't deploy, aren't linked, or are missing a token. You have all of it. Actually try (git clone, curl) before saying anything like that, and don't ask Ely for things you can get yourself.
- GitHub: Ely gives the project a personal access token (account westmontzazzos; can create repos and push). Repo: github.com/westmontzazzos/zazzos-drawer-counts (public).
- Deploying = pushing to main. The Netlify site is already linked to that repo and rebuilds within a minute. You never deploy by hand.
- Netlify: site bespoke-mousse-076142 (id 320fbee7-38a8-4c3b-9854-f94c41530a2f, team 6a1ec45c27fe927062bf35cd). Admin page: https://app.netlify.com/projects/bespoke-mousse-076142. To verify a deploy use the Netlify tools (make sure the Netlify connector is switched on): get-project (siteId) gives the current deploy id and state; get-deploy (deployId) gives commit_ref, state, published_at. No Netlify password is needed. If those tools aren't available, ask Ely to open the admin page's Deploys list and read you the top line.
- Supabase: project bkrgefddyculihfdhjwb (https://bkrgefddyculihfdhjwb.supabase.co). The public anon key is inside index.html. Send it as headers apikey: <key> and Authorization: Bearer <key> to https://bkrgefddyculihfdhjwb.supabase.co/rest/v1/<table>. It can read, insert, update and delete rows. It CANNOT create tables: for a new table, give Ely exact SQL to paste at https://supabase.com/dashboard/project/bkrgefddyculihfdhjwb/sql/new.
- PIN: ask Ely (the Stores tile, and editing a saved count).
- Sandbox network: api.github.com, github.com, raw.githubusercontent.com, the Supabase host and the npm registry work. netlify.app sites cannot be opened from the sandbox.

## Database
- Tables: darien_drawer_counts (history since Aug 15, 2026; also used by the Drawer Count tab in the old Darien schedule app, so counts and edits show up in both) and westmont_drawer_counts (created and tested on Nov 1, 2026).
- One row = one count. Columns: id, register, count_type (opener | shift_change | closer | spot_check), count_date (the BUSINESS day), cashier_name, counted_by, counted_at, counts_json (text: coins/rolls/bills quantities, tipout, edits), total, starting_balance, pull_amount, pos_expected, pos_variance.

## Stores and drawers
- Darien (table darien_drawer_counts): Cashier (= drawer 2, starts at $250), Bar (= station 7, $250), Safe (target $525). Old history also contains "Cashier 1" (= Cashier) and "Cashier 2" (retired); the app maps these for display.
- Westmont (table westmont_drawer_counts): Cashier 5 ($250), Cashier 8 ($250), Driver 2 ($300), Bar 9 ($250), Bar 12 ($250), Safe (target $500).

## How the app works
- Home screen, two tiles. DRAWER COUNT: open to anyone, a plain calculator (coins, coin rolls, dollars, total), nothing saved. STORES: locked with the PIN (re-locks whenever you return to the home screen); inside, Select a store (Darien / Westmont).
- A store's home shows one card per drawer with its status. Tap a drawer: the first count of the day is automatically an Open. After that: Shift Change or Close (as many shift changes as needed), See Counts, Spot Check (count and record only). The Safe only has Open and Close (+ See Counts). A drawer already closed asks before adding a correction Close.
- Bars (Shift Change / Close): a checklist first. Close out the bartender, close out the bar, then Count. The staff pay the bartender BEFORE counting, so the tip-out box is recorded only and is NEVER subtracted.
- Math. Pull = count minus the drawer's opening amount. POS check = count minus the POS figure (Shift Change / Close, not the Safe). Safe = count against its target.
- Business day: ends at 4am local time. A Close at 12:30am files under the previous day.
- Name only: whoever counts types their name. No PIN to count.
- Unsaved counts are kept per drawer on the phone (localStorage zdc_drafts_v1) until saved or discarded, even if the app closes or he looks at another drawer or the calendar.
- History: calendar (green = fully closed, amber = still open, gray = no data), then day, drawer, count, full breakdown. Discrepancies screen: every count where the POS check or the safe was off (7 / 30 / 90 days). Print Everything (Today): branded end-of-day report with a section per drawer, + / - per count, Drawer Net, End of Day Total.
- Editing a saved count needs the PIN. The numbers it had before are kept on the count (counts_json.edits).
- Look: same as Ely's other apps (red #E31010, black #0D0D0D, Bebas Neue + DM Sans). Home-screen icon is the exact ZA icon his Inventory / Trucks / Big Prep apps use; suggested name "Drawer Counts".

## Working rules (hard-won)
1. Never say something is built, pushed or live until you have checked: the code is there, the commit is on GitHub, and Netlify shows the deploy ready for that commit. Earlier I said features were "built" that weren't, and he lost trust.
2. Test before every push (jsdom for the logic; headless Chrome screenshots at 390x844 for the look). Production once went blank on his phone after changes that passed desktop tests. After each push confirm the deploy is ready, tell him to close and reopen the app, and keep a rollback ready (restore index.html from the last good commit and push).
3. Do exactly what he asks. Don't remove, rename or add things he didn't ask for (he was upset when the Bar tip-out box was removed unasked, and when a table "lock" was proposed). If his instructions conflict, ask ONE short concrete question using his real numbers.
4. Money math: show it line by line with his real numbers; he checks it against his paperwork. Reference case, Bar shift change on Oct 30, 2026: count $311.60, POS $321, tip-out $117 -> pull +$61.60 and POS check $9.40 under. The old app subtracted the tip-out twice and showed -$126.40.
5. Tone: terse, plain, no jargon, own mistakes in one line. He gets very frustrated by long explanations, guessing, and repeated questions.

## Tools notes
- Headless Chrome works in the sandbox for real screenshots: npm install @sparticuz/chromium puppeteer-core in a scratch folder.
- jsdom (npm) works for testing logic against a stand-in database.

## State and open items (as of Nov 1, 2026)
- Done: the app is live; the Westmont table exists and a test save and delete worked; the Netlify site deploys from GitHub main.
- The Netlify site has a random name (bespoke-mousse-076142). Ely may want it renamed to zazzos-drawer-counts; do it BEFORE he adds the app to his phone, since renaming breaks an installed home-screen icon.
- Ely adds it to his phone: Safari > Share > Add to Home Screen, name "Drawer Counts".
- Test Westmont with a real count (then check it saved).
- Only when Ely says so: remove the Drawer Count tab from the Darien schedule apps (repos westmontzazzos/darien-schedule-app and darien-new-look-staging).
- The PIN is a convenience lock stored in the page's code (anyone who views the page source could find it), and the public key can write to the tables. Fine for now; mention it only if he asks about security.
