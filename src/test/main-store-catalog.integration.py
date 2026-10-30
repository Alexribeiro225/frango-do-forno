"""Live regression check: run after minting the main store's browser session."""
import asyncio
import json
import time
from pathlib import Path
from playwright.async_api import async_playwright


async def main():
    with open(Path.home() / ".cache/lovable-auth/session.json") as file:
        session = json.load(file)["session"]
    assert session["user"]["id"] == "89ab7006-28c7-4107-8477-72d74c6c1b8f", "Use the main store session"
    session["expires_at"] = int(time.time() * 1000) + 3_500_000
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await page.goto("http://localhost:8080")
        await page.evaluate('(s) => localStorage.setItem("frango-show-admin-session", JSON.stringify(s))', session)
        await page.goto("http://localhost:8080/admin")
        await page.get_by_role("button", name="Produtos e combos", exact=True).click()
        await page.locator(".admin-row").nth(13).wait_for()
        assert await page.locator(".admin-row").count() == 14
        assert await page.locator(".admin-row").filter(has_text="Combos").count() == 4
        joelho = page.locator(".admin-row").filter(has_text="Combo Joelho de Porco")
        await joelho.get_by_role("button", name="Editar", exact=True).click()
        await page.get_by_label("Quantidade de Joelho de Porco por combo", exact=True).wait_for()
        assert await page.get_by_label("Quantidade de Joelho de Porco por combo", exact=True).input_value() == "1"
        public_page = await context.new_page()
        response = await public_page.goto("http://localhost:8080")
        assert response and response.ok
        await public_page.wait_for_function('document.querySelectorAll(".product-card").length >= 14')
        assert await public_page.locator(".product-card").filter(has_text="Combo Joelho de Porco").count() >= 1
        print("PASS: main store sees 14 products, 4 combos, saved recipe; public menu remains visible")
        await browser.close()


asyncio.run(main())