# Setup Notes for Claude Code

## Install

Setup using the installer scripts for your operating system instead of using Homebrew or another package manager. A number of users have experienced issues when installing with Homebrew or via npm that were not present when using a native installer.

MacOS, Linux & WSL
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Windows
```powershell
irm https://claude.ai/install.ps1 | iex
```

After install is complete follow the below guide to configure Claude Code to use AWS Bedrock for inference, instead of the Anthropic API.

[Bedrock Setup for Claude Code](https://github.boozallencsn.com/civiltech/ai-sdlc-adoption-framework/blob/main/solutions/tools/coding-agents/claude-code/local-setup.md#configure-claude-code-to-use-amazon-bedrock)

We highly recommend using the AWS CLI to manage your session credentials automatically. Users have also ran into errors when using the AWS CLI when installed via a package manager, so we recommend using the OS specific installation in the AWS docs [here](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).

With the AWS CLI installed, you will need to ensure that your `~/.aws/config` file follows the below template to work correctly SSO via Claude Code. This example profile is configured to use the `default` profile with the correct IAM Role for Claude Code, but you may change it to whatever profile you would like. Ensure it matches the profile setup in the `~/.claude/settings.json` file in our earlier guide.

```txt
[default]
sso_session = default
sso_account_id = 972684823926
sso_role_name = BAHSSO_972684823926_GenericClaudeBedrock
region = us-east-1
output = json

[sso-session default]
sso_start_url = https://bahextendedenterprise.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access
```

The latest Claude models which also should be updated in the `~/.claude/settings.json` file are listed below with their inference profile.

- Opus 4.6 - `us.anthropic.claude-opus-4-6-v1`
- Sonnet 4.6 - `us.anthropic.claude-sonnet-4-6`
- Haiku 4.5 - `us.anthropic.claude-haiku-4-5-20251001-v1:0`
