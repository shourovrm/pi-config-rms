# pi-config-rms

Personal pi coding agent configuration — extensions, skills, and dependencies.

## Install

```bash
pi install git:github.com/shourovrm/pi-config-rms
```

Pi will clone the repo, install npm dependencies, and load all extensions and skills automatically.

### Python-based skills

These skills use Python venvs. Run their setup once after installing:

```bash
# docx-reader
cd ~/.pi/agent/git/github.com/shourovrm/pi-config-rms/skills/docx-reader
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# pdf-reader
cd ~/.pi/agent/git/github.com/shourovrm/pi-config-rms/skills/pdf-reader
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# ppt-reader
cd ~/.pi/agent/git/github.com/shourovrm/pi-config-rms/skills/ppt-reader
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# xlsx-reader
cd ~/.pi/agent/git/github.com/shourovrm/pi-config-rms/skills/xlsx-reader
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

## Update

Pull the latest and reinstall dependencies:

```bash
pi update --extensions
```

## Syncing changes

After making changes to your local pi config, push them back to this repo:

```bash
cd ~/.pi/agent/git/github.com/shourovrm/pi-config-rms
git add -A && git commit -m "Update config" && git push
```

Then pull on your other machine:

```bash
pi update --extensions
```

Or if you're editing from the source repo at `~/repos/pi-related/pi-config-rms`, push from there and run `pi update --extensions` on all machines.
