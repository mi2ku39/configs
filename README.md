# mi2ku39/configs
renovate config, GitHub Actionsがまとめられています。

## Renovate config
- `"platformAutomerge": true` を追加すると良い

### global config
```json
{
    "$schema": "https://docs.renovatebot.com/renovate-global-schema.json",
    "onboarding": false,
    "platform": "github",
    "repositories": [
        "foo/bar"
    ],
    "username": "renovate"
}
```

### config
```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>mi2ku39/configs:renovate"],
  "platformAutomerge": true
}
```

## workflow

### renovate

