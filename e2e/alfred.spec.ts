import {expect, test} from '@playwright/test';
test('installed tarball uses host adapters and packaged assets',async({page,isMobile})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const nitrogenCalls:string[]=[];page.on('request',request=>{if(request.url().includes('api.nitrogenx.co')) nitrogenCalls.push(request.url());});
 await page.goto('/');await page.getByRole('button',{name:'Open Ask Alfred'}).click();await page.getByRole('button',{name:'Ask about our product'}).click();
 await expect(page.getByRole('log')).toContainText('example-product-guide');await expect(page.getByRole('link',{name:'Example documentation'})).toHaveAttribute('href','https://example.org/docs');
 if(isMobile) await page.getByRole('combobox',{name:'Alfred views'}).selectOption('faq'); else await page.getByRole('button',{name:'FAQ',exact:true}).click();await expect(page.getByText('Who owns the knowledge?')).toBeVisible();
 if(isMobile) await page.getByRole('combobox',{name:'Alfred views'}).selectOption('chat'); else await page.getByRole('button',{name:'Chat',exact:true}).click();await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.nx-ask-brand-logo img')).toBeVisible();
 expect(await page.locator('.nx-ask-brand-logo img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 expect(nitrogenCalls).toEqual([]);expect(errors).toEqual([]);
});
