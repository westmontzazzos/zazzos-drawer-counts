# Zazzo's Drawer Counts

One app for counting cash drawers at both stores (Darien and Westmont). Single file: `index.html` (plus the home-screen icon files and `manifest.webmanifest`).
No build step -- Netlify serves it as-is. Whoever counts types their name.

## Home screen
- **Drawer Count**: open to anyone. A plain counter -- coins, coin rolls, dollars, total. Nothing is saved.
- **Stores**: locked with a PIN (re-locks whenever you return to the home screen). Inside: Darien / Westmont.
- **Editing a saved count** needs the same PIN. The numbers a count had before are kept on the count itself (`counts_json.edits`).
- Home-screen icon is the ZA only; the name suggested when added is "Drawer Counts".

## Stores and drawers
- **Darien** (table `darien_drawer_counts`, history carried over from the old Darien app): Cashier (drawer 2, float $250), Bar (station 7, float $250), Safe (target $525).
- **Westmont** (table `westmont_drawer_counts`): Cashier 5 ($250), Cashier 8 ($250), Driver 2 ($300), Bar 9 ($250), Bar 12 ($250), Safe (target $500).

## How a drawer works
- First tap of the day = **Open**. After that: **Shift Change** or **Close** (as many shift changes as needed), plus **See Counts** and **Spot Check** (count and record only). The Safe only has Open and Close.
- **Bars** (Shift Change / Close): a checklist first -- close out the bartender, close out the bar, then Count. They pay the bartender before counting, so the tip-out box is **recorded only** and never subtracted.
- Pull = count minus the drawer's opening amount. POS check = count minus the POS figure.
- **Business day ends at 4am**: a Close at 12:30am files under the previous day.
- Unsaved counts are kept per drawer (on the phone) until saved or discarded.

## Screens
Select a store -> store home (drawer cards, Print Everything, Discrepancies, History) -> count form. History is a calendar: day -> drawer -> count -> breakdown. Discrepancies lists every count where the POS check or the safe was off.

## Database
Supabase project `bkrgefddyculihfdhjwb`. Each count is one row: register, count_type (opener / shift_change / closer / spot_check), count_date (business day), cashier_name, counted_by, counted_at, counts_json, total, starting_balance, pull_amount, pos_expected, pos_variance.
