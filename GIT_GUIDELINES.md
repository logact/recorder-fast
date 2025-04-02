# Git 开发规范指南

## 1. 分支命名规范

### 1.1 主分支
- `main` 或 `master`：主分支，用于生产环境
- `develop`：开发分支，用于集成所有功能

### 1.2 功能分支（Feature Branches）
格式：`feature/功能名称-简短描述`
示例：
```
feature/user-authentication
feature/payment-integration
feature/voice-recording
```

### 1.3 修复分支（Bugfix Branches）
格式：`bugfix/问题描述`
示例：
```
bugfix/login-error
bugfix/recording-crash
```

### 1.4 发布分支（Release Branches）
格式：`release/版本号`
示例：
```
release/v1.0.0
release/v1.1.0
```

### 1.5 热修复分支（Hotfix Branches）
格式：`hotfix/问题描述`
示例：
```
hotfix/critical-security-fix
hotfix/urgent-payment-issue
```

## 2. 提交信息规范

### 2.1 提交信息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2.2 类型（Type）
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响代码运行的变动）
- `refactor`: 重构（既不是新增功能，也不是修改 bug 的代码变动）
- `perf`: 性能优化
- `test`: 增加测试
- `chore`: 构建过程或辅助工具的变动
- `ci`: CI 配置文件和脚本的改动

### 2.3 范围（Scope）
可选，表示影响的范围，如：
- `auth`: 认证相关
- `ui`: 用户界面
- `api`: API 相关
- `recorder`: 录音功能
- `storage`: 存储相关

### 2.4 主题（Subject）
- 使用现在时态
- 首字母小写
- 不要以句号结尾
- 简短描述（50个字符以内）

### 2.5 正文（Body）
- 详细描述改动内容
- 使用现在时态
- 说明改动的原因和影响

### 2.6 页脚（Footer）
- 关闭相关 issue
- 列出重大变更

## 3. 提交信息示例

### 3.1 新功能提交
```
feat(auth): add user authentication

- Add login form component
- Implement JWT token handling
- Add protected routes

Closes #123
```

### 3.2 Bug 修复提交
```
fix(recorder): resolve audio recording crash

- Fix memory leak in audio buffer
- Add error handling for recording process
- Update error messages

Fixes #456
```

### 3.3 重构提交
```
refactor(storage): improve data persistence

- Implement new storage service
- Add data migration script
- Update storage interface

BREAKING CHANGE: Storage API has been completely rewritten
```

## 4. 最佳实践

### 4.1 分支管理
- 保持分支名称简洁明了
- 使用小写字母和连字符
- 避免使用特殊字符

### 4.2 提交信息
- 每个提交只做一件事
- 提交信息要清晰描述改动
- 使用英文编写提交信息
- 重要改动要详细说明原因

### 4.3 工作流程
- 定期从主分支拉取更新
- 及时合并和删除已完成的分支
- 保持提交历史的整洁

### 4.4 代码审查
- 提交前进行代码审查
- 确保提交信息符合规范
- 确保代码风格一致

## 5. 规范的好处

这套规范可以帮助团队：
- 保持代码库的整洁
- 提高代码审查效率
- 方便追踪问题和功能
- 自动化生成变更日志
- 提高团队协作效率

## 6. 实际操作示例

### 6.1 分支操作示例

#### 6.1.1 创建功能分支
```bash
# 从 develop 分支创建新功能分支
git checkout develop
git pull origin develop
git checkout -b feature/voice-recording

# 或者使用简写
git checkout -b feature/voice-recording develop
```

#### 6.1.2 创建修复分支
```bash
# 从 main 分支创建修复分支
git checkout main
git pull origin main
git checkout -b bugfix/recording-crash
```

#### 6.1.3 合并分支
```bash
# 将功能分支合并到 develop
git checkout develop
git pull origin develop
git merge feature/voice-recording
git push origin develop

# 删除已合并的分支
git branch -d feature/voice-recording
```

### 6.2 提交操作示例

#### 6.2.1 新功能开发提交
```bash
# 添加新文件
git add src/features/recorder/Recorder.tsx

# 提交更改
git commit -m "feat(recorder): implement basic recording functionality

- Add Recorder component with start/stop functionality
- Implement audio recording using MediaRecorder API
- Add basic error handling

Closes #123"
```

#### 6.2.2 Bug 修复提交
```bash
# 修复问题
git add src/features/recorder/Recorder.tsx

# 提交修复
git commit -m "fix(recorder): resolve audio recording crash on iOS

- Fix memory leak in audio buffer handling
- Add platform-specific error handling
- Update error messages for better user feedback

Fixes #456"
```

#### 6.2.3 文档更新提交
```bash
# 更新文档
git add README.md

# 提交文档更新
git commit -m "docs: update installation instructions

- Add iOS specific setup steps
- Update dependency versions
- Add troubleshooting section"
```

#### 6.2.4 代码重构提交
```bash
# 重构代码
git add src/services/storage/

# 提交重构
git commit -m "refactor(storage): improve data persistence layer

- Implement new IndexedDB storage service
- Add data migration utilities
- Update storage interface for better type safety

BREAKING CHANGE: Storage API methods have been renamed for consistency"
```

### 6.3 实际工作流程示例

#### 6.3.1 开发新功能
```bash
# 1. 创建功能分支
git checkout -b feature/voice-recording develop

# 2. 开发功能并提交
git add .
git commit -m "feat(recorder): add basic recording UI"

# 3. 继续开发
git add .
git commit -m "feat(recorder): implement audio processing"

# 4. 完成功能后合并到 develop
git checkout develop
git pull origin develop
git merge feature/voice-recording
git push origin develop

# 5. 删除功能分支
git branch -d feature/voice-recording
```

#### 6.3.2 紧急修复
```bash
# 1. 从 main 创建热修复分支
git checkout -b hotfix/critical-recording-issue main

# 2. 修复问题并提交
git add .
git commit -m "fix(recorder): resolve critical recording crash

- Fix buffer overflow in audio processing
- Add emergency error recovery
- Update error logging

Fixes #789"

# 3. 合并到 main 和 develop
git checkout main
git merge hotfix/critical-recording-issue
git push origin main

git checkout develop
git merge hotfix/critical-recording-issue
git push origin develop

# 4. 删除热修复分支
git branch -d hotfix/critical-recording-issue
```

### 6.4 常见错误示例

#### 6.4.1 不规范的提交信息
```bash
# ❌ 不推荐
git commit -m "fixed bug"
git commit -m "update"
git commit -m "changes"

# ✅ 推荐
git commit -m "fix(recorder): resolve audio playback issue"
git commit -m "feat(auth): implement user login"
git commit -m "docs: update API documentation"
```

#### 6.4.2 不规范的分支命名
```bash
# ❌ 不推荐
git checkout -b "new_feature"
git checkout -b "fix-bug"
git checkout -b "update/recorder"

# ✅ 推荐
git checkout -b "feature/voice-recording"
git checkout -b "bugfix/audio-playback"
git checkout -b "hotfix/critical-security"
``` 