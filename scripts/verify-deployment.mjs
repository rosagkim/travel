const siteUrl = process.env.DEPLOYMENT_URL;
const expectedCommit = process.env.EXPECTED_COMMIT;
if (!siteUrl || !/^[a-f0-9]{40}$/.test(expectedCommit ?? '')) throw new Error('DEPLOYMENT_URL and EXPECTED_COMMIT are required');
let failure;
for (let attempt = 1; attempt <= 12; attempt++) {
  try {
    const page = new URL(siteUrl);
    page.searchParams.set('build', expectedCommit);
    const response = await fetch(page, { signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) throw new Error(`Site returned ${response.status}`);
    const html = await response.text();
    if (!html.includes(`name="build-commit" content="${expectedCommit}"`)) throw new Error('Latest build has not reached Pages yet');
    if (!html.includes('Seoul Perks')) throw new Error('Application shell is missing');
    const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => new URL(match[1], page));
    if (assets.length < 2) throw new Error('Application assets are missing');
    for (const asset of assets) {
      const result = await fetch(asset, { signal: AbortSignal.timeout(15000) });
      if (!result.ok || !(await result.text()).length) throw new Error(`Asset failed: ${asset.pathname}`);
    }
    console.log(`Verified deployed commit ${expectedCommit}: HTML and ${assets.length} assets available at ${siteUrl}`);
    failure = undefined;
    break;
  } catch (error) {
    failure = error;
    console.log(`Verification ${attempt}/12: ${error.message}`);
    if (attempt < 12) await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
if (failure) throw failure;
