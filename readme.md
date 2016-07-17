## vkAnswerMachine - автоответчик для ВКонтакте на node.js
# Запуск
### Получите токен
[https://oauth.vk.com/authorize?client_id=5550899&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=4098&response_type=token&v=5.52&state=4itProductions](https://oauth.vk.com/authorize?client_id=5550899&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=4098&response_type=token&v=5.52&state=4itProductions)
### Переименуйте config.js.default в config.js и вставьте туда токен
```js
exports.token = '<access_token>';
```
### Запустите
```bash
node index.js
```
### Демонизируйте
Для непрерывной работой можно воспользоваться [PM2](https://github.com/Unitech/pm2)
```bash
npm install pm2 -g
pm2 startup
pm2 start index.js --name=vkAnswer
pm2 save
#pm2 logs - логи
```