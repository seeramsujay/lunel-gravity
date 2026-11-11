import json
from pathlib import Path

def test_root_package_json():
    root_pkg = Path("package.json")
    assert root_pkg.exists()
    data = json.loads(root_pkg.read_text())
    assert data["name"] == "lunel-gravity"
    assert "scripts" in data

def test_cli_package_json():
    cli_pkg = Path("cli/package.json")
    assert cli_pkg.exists()
    data = json.loads(cli_pkg.read_text())
    assert data["name"] == "lunel-cli"
    assert "bin" in data

def test_pty_cargo_manifest():
    cargo = Path("pty/Cargo.toml")
    assert cargo.exists()
    content = cargo.read_text()
    assert 'name = "lunel-pty"' in content
    assert 'edition = "2021"' in content
    assert 'portable-pty' in content

def test_chat_extension_package():
    ext_pkg = Path("antigravity-chat-extension/package.json")
    assert ext_pkg.exists()
    data = json.loads(ext_pkg.read_text())
    assert "antigravity" in data["name"].lower()
