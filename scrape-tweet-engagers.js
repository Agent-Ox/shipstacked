// scrape-tweet-engagers.js
// Scrapes likers and retweeters from a given tweet URL using Playwright + logged-in X account.
// Outputs: ~/Desktop/ShipStacked/tweet-engagers.csv

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TWEET_URL = 'https://x.com/coreyganim/status/2036846333051687233';
const OUTPUT_DIR = path.join(process.env.HOME, 'Desktop', 'ShipStacked');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'tweet-engagers.csv');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'tweet-engagers-progress.json');

const TWITTER_USER = 'oxleadshq';
const TWITTER_PASS = 'Oxl34d5888$';

const SCROLL_PAUSE = 2000;
const MAX_USERS = 5000;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function loginToTwitter(page) {
  console.log('Logging into X...');
  await page.goto('https://x.com/i/flow/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);

  const usernameInput = await page.waitForSelector('input[autocomplete="username"]', { timeout: 20000 });
  await usernameInput.fill(TWITTER_USER);
  await page.keyboard.press('Enter');
  await sleep(2500);

  const usernamePrompt = page.locator('input[data-testid="ocfEnterTextTextInput"]');
  if (await usernamePrompt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await usernamePrompt.fill(TWITTER_USER);
    await page.keyboard.press('Enter');
    await sleep(2000);
  }

  const passInput = await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await passInput.fill(TWITTER_PASS);
  await page.keyboard.press('Enter');
  await sleep(4000);
  console.log('Logged in.');
}

async function scrapeUserList(page, url, label) {
  console.log(`\n📋 Scraping ${label}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);

  const users = new Map(); // handle -> {handle, name, bio, location, website, followers}
  let lastCount = 0;
  let noNewCount = 0;

  while (users.size < MAX_USERS) {
    // Extract all user cells visible on page
    const cells = await page.$$('[data-testid="UserCell"]');

    for (const cell of cells) {
      try {
        // Get handle from profile link
        const link = await cell.$('a[href^="/"][role="link"]');
        if (!link) continue;
        const href = await link.getAttribute('href');
        const handle = href?.split('/').filter(Boolean)[0];
        if (!handle || handle.length < 2 || users.has(handle)) continue;

        // Get display name
        const nameEl = await cell.$('[data-testid="UserName"] span span');
        const name = nameEl ? await nameEl.textContent() : '';

        // Get bio
        const bioEl = await cell.$('[data-testid="UserDescription"]');
        const bio = bioEl ? await bioEl.textContent() : '';

        // Get location
        const locEl = await cell.$('[data-testid="UserLocation"]');
        const location = locEl ? await locEl.textContent() : '';

        // Get website
        const webEl = await cell.$('[data-testid="UserUrl"] a');
        const website = webEl ? await webEl.getAttribute('href') : '';

        // Get follower count (not always in UserCell but try)
        const followerEl = await cell.$('a[href$="/followers"] span');
        const followers = followerEl ? await followerEl.textContent() : '';

        users.set(handle, {
          handle: `@${handle}`,
          name: name?.trim() || '',
          bio: bio?.trim() || '',
          location: location?.trim() || '',
          website: website?.trim() || '',
          followers: followers?.trim() || '',
          source: label
        });
      } catch (e) {
        // skip cell
      }
    }

    const currentCount = users.size;
    process.stdout.write(`\r  Found ${currentCount} users...`);

    if (currentCount === lastCount) {
      noNewCount++;
      if (noNewCount >= 5) {
        console.log(`\n  No new users after ${noNewCount} scrolls — done.`);
        break;
      }
    } else {
      noNewCount = 0;
    }
    lastCount = currentCount;

    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 1500));
    await sleep(SCROLL_PAUSE);
  }

  console.log(`\n✅ ${label}: ${users.size} users collected`);
  return [...users.values()];
}

function escapeCSV(val) {
  if (!val) return '';
  const s = String(val).replace(/\n/g, ' ').replace(/\r/g, '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  console.log('🚀 ShipStacked — Tweet Engager Scraper');
  console.log(`🎯 Tweet: ${TWEET_URL}`);
  console.log(`📁 Output: ${OUTPUT_FILE}\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 }
  });

  const page = await context.newPage();

  try {
    await loginToTwitter(page);
  } catch (err) {
    console.error('❌ Login failed:', err.message);
    await browser.close();
    return;
  }

  // Extract tweet ID from URL
  const tweetId = TWEET_URL.split('/status/')[1].split('?')[0];

  let allUsers = [];

  // Scrape likers
  try {
    const likers = await scrapeUserList(
      page,
      `https://x.com/i/timeline/liked_by/${tweetId}`,
      'Likers'
    );
    allUsers = allUsers.concat(likers);
  } catch (e) {
    console.log('⚠️  Could not scrape likers:', e.message);
  }

  // Scrape retweeters
  try {
    const retweeters = await scrapeUserList(
      page,
      `https://x.com/i/timeline/retweeted_by/${tweetId}`,
      'Retweeters'
    );
    // Merge — avoid duplicates, note if both liked+retweeted
    for (const u of retweeters) {
      const existing = allUsers.find(x => x.handle === u.handle);
      if (existing) {
        existing.source = 'Liker+Retweeter';
      } else {
        allUsers.push(u);
      }
    }
  } catch (e) {
    console.log('⚠️  Could not scrape retweeters:', e.message);
  }

  // Also scrape reply authors from the tweet itself
  try {
    console.log('\n📋 Scraping reply authors...');
    await page.goto(TWEET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    const replyUsers = new Set();
    let scrolls = 0;

    while (scrolls < 20) {
      const tweets = await page.$$('[data-testid="tweet"]');
      for (const tweet of tweets) {
        try {
          const link = await tweet.$('a[href^="/"][role="link"]');
          if (!link) continue;
          const href = await link.getAttribute('href');
          const handle = href?.split('/').filter(Boolean)[0];
          if (!handle || handle === 'coreyganim') continue;

          if (!replyUsers.has(handle) && !allUsers.find(u => u.handle === `@${handle}`)) {
            replyUsers.add(handle);
            allUsers.push({
              handle: `@${handle}`,
              name: '',
              bio: '',
              location: '',
              website: '',
              followers: '',
              source: 'Reply'
            });
          }
        } catch (e) {}
      }

      await page.evaluate(() => window.scrollBy(0, 1500));
      await sleep(1500);
      scrolls++;
    }
    console.log(`✅ Replies: ${replyUsers.size} reply authors collected`);
  } catch (e) {
    console.log('⚠️  Could not scrape replies:', e.message);
  }

  await browser.close();

  // Save progress JSON
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(allUsers, null, 2));

  // Write CSV
  const headers = ['handle', 'name', 'bio', 'location', 'website', 'followers', 'source'];
  const likerCount = allUsers.filter(u => u.source.includes('Liker')).length;
  const retweeterCount = allUsers.filter(u => u.source.includes('Retweeter')).length;
  const replyCount = allUsers.filter(u => u.source === 'Reply').length;

  const commentRow = `# Total: ${allUsers.length} | Likers: ${likerCount} | Retweeters: ${retweeterCount} | Replies: ${replyCount} | Tweet: ${TWEET_URL}`;
  const csvRows = [
    commentRow,
    headers.join(','),
    ...allUsers.map(u => headers.map(h => escapeCSV(u[h])).join(','))
  ];

  fs.writeFileSync(OUTPUT_FILE, csvRows.join('\n'), 'utf-8');

  console.log('\n\n=== DONE ===');
  console.log(`Total users: ${allUsers.length}`);
  console.log(`  Likers: ${likerCount}`);
  console.log(`  Retweeters: ${retweeterCount}`);
  console.log(`  Reply authors: ${replyCount}`);
  console.log(`CSV saved to: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
