const TelegramApi = require('node-telegram-bot-api')

const _ = require('lodash')

const token = '5753911754:AAHpaCL7hNqjGaTGAEcXWth01qkRB6Ba_f4'

const https = require('https')

const bot = new TelegramApi(token, {polling: true})

const districtOptions = {
    reply_markup: JSON.stringify({
        inline_keyboard: [
            [{text: 'Адмиралтейский', callback_data: '1'}],
            [{text: 'Василеостровский', callback_data: '2'}],
            [{text: 'Выборгский', callback_data: '3'}],
        ]
    })
}

const start = () => {
    bot.setMyCommands([
        {command: '/info', description: 'Показать, что может этот бот'},
        {command: '/schedule', description: 'Записаться ко врачу'}
    ])

    bot.on('message', msg => {
        const text = msg.text
        const chatId = msg.chat.id

        if (text === '/schedule') {
            return bot.sendMessage(chatId, 'Выберите район', districtOptions)
        } else if (text === '/info') {
            return bot.sendMessage(chatId, 'Тут должна быть информация')
        }
        getDistricts().then(function (districts) {
            _.forEach(districts, function (district) {
                console.log(district.name)
            })
        }).catch(function (err) {
            console.log('Oops: ' + err);
        });

        return bot.sendMessage(chatId, 'Я ничо не понял')
    })

    bot.on('callback_query', msg => {
        console.log('ID of selected district: ' + msg.data)
    })
}

function getDistricts() {
    return new Promise((resolve, reject) => {
        https.get('https://gorzdrav.spb.ru/_api/api/v2/shared/districts', (res) => {
            let body = '';
            res.on('data', function(chunk) {
                body += chunk;
            });
            if (res.statusCode !== 404) {
                res.on('end', function() {
                    let json = JSON.parse(body)
                    let districts = json.result
                    resolve(districts);
                });
            } else {
                reject('404')
            }
        });
    });
}

start()

