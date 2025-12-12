数据查询	find(id)	根据 ID 查询单个记录（Promise 形式），不存在则 reject
findAndObserve(id)	查询并监听单个记录变化（返回 Observable），删除时触发 complete
query(...clauses)	构建查询条件（支持多参数 / 数组形式），返回 Query 实例用于链式查询
数据创建	create(recordBuilder)	在 Write 事务中创建记录（接收回调函数设置属性），自动批量提交
prepareCreate(recordBuilder)	预创建记录（不自动提交），用于批量操作（配合 Database.batch）
prepareCreateFromDirtyRaw(dirtyRaw)	基于原始数据（DirtyRaw）预创建记录（性能优化 / 自定义同步场景）
disposableFromDirtyRaw(dirtyRaw)	创建临时记录（只读，不存入数据库，用于临时展示 / 在线数据适配）
变更监听	experimentalSubscribe(subscriber)	订阅集合变更（创建 / 更新 / 删除），返回取消订阅函数
changes（Subject）	变更信号流（发射 CollectionChangeSet，包含变更记录和类型）
内部辅助（暴露）	_fetchQuery/._fetchIds/._fetchCount	内部查询实现（支持查询记录列表 / ID 列表 / 计数，回调形式）