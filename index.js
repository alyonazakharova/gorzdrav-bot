const TelegramApi = require('node-telegram-bot-api')
const _ = require('lodash')
const axios = require('axios')

const token = '5753911754:AAHpaCL7hNqjGaTGAEcXWth01qkRB6Ba_f4'

const bot = new TelegramApi(token, {polling: true})

// TODO remove to another file ???
class ProcessInfo {
    isDistrictSelected = false
    isLpuSelected = false
    isSpecialtySelected = false
    isDoctorSelected = false
    lpuId
    specialtyId

//    constructor() {
//        this.isDistrictSelected = false
//        this.isLpuSelected = false
//        this.isSpecialtySelected = false
//        this.isDoctorSelected = false
//        this.lpuId = -1
//        this.specialtyId = -1
//    }
}

var usersMap = new Map()

const start = () => {
    bot.setMyCommands([
        {command: '/info', description: 'Показать, что может этот бот'},
        {command: '/schedule', description: 'Записаться ко врачу'}
    ])

    bot.on('message', async msg => {
        const text = msg.text
        const chatId = msg.chat.id

        if (text === '/schedule') {
            usersMap.set(chatId, new ProcessInfo())

            let districts = await getDistricts()
            let districtOptions = getDistrictOptions(districts)

            return bot.sendMessage(chatId, 'Выберите район', districtOptions)
        } else if (text === '/info') {
            return bot.sendMessage(chatId, 'Тут должна быть информация')
        }
        return bot.sendMessage(chatId, 'Я вас не понимаю')
    })

    bot.on('callback_query', async msg => {
        let chatId = msg.message.chat.id
        let processInfo = usersMap.get(chatId)

        let reply = "initial reply"

        if (!processInfo.isDistrictSelected) {
            processInfo.isDistrictSelected = true

            let districtId = msg.data
            reply = `SELECTED DISTRICT ID IS ${districtId}`
            bot.sendMessage(chatId, reply)

            let lpus = await getLpus(districtId)
            let lpuOptions = getLpuOptions(lpus)
            return bot.sendMessage(chatId, 'Выберите учреждение', lpuOptions)
        } else if (!processInfo.isLpuSelected) {
            processInfo.isLpuSelected = true
            processInfo.lpuId = msg.data
            reply = `SELECTED LPU ID IS ${processInfo.lpuId}`
            return bot.sendMessage(chatId, reply)
            // TODO specialty selection
        } else if (!processInfo.isSpecialtySelected) {
            return bot.sendMessage(chatId, "Тут тоже еще не допилили выбор докторов :(")
        }
        return bot.sendMessage(chatId, "Что-то еще не допилили походу :(")
    })
}

async function getDistricts() {
    const response = await axios.get('https://gorzdrav.spb.ru/_api/api/v2/shared/districts')
    return response.data.result
}

function getDistrictOptions(districts) {
    let districtOptions = new Array(districts.length)
    for (let i = 0; i < districts.length; i++) {
        districtOptions[i] =  [{text: districts[i].name, callback_data: districts[i].id}]
    }
    return {"reply_markup": JSON.stringify({inline_keyboard: districtOptions})}
}

async function getLpus(districtId) {
    let url = `https://gorzdrav.spb.ru/_api/api/v2/shared/district/${districtId}/lpus`
    const response = await axios.get(url)
    return response.data.result
}

function getLpuOptions(lpus) {
    let lpuOptions = new Array(lpus.length)
    for (let i = 0; i < lpus.length; i++) {
        lpuOptions[i] =  [{text: lpus[i].lpuShortName, callback_data: lpus[i].id}]
    }
    return {"reply_markup": JSON.stringify({inline_keyboard: lpuOptions})}
}

async function getSpecialties(lpuId) {
    let url = `https://gorzdrav.spb.ru/_api/api/v2/schedule/lpu/${lpuId}/specialties`
    const response = await axios.get(url)
    return response.data.result
}

async function getDoctors(lpuId, specialtyId) {
    let url = `https://gorzdrav.spb.ru/_api/api/v2/schedule/lpu/${lpuId}/speciality/${specialtyId}/doctors`
    const response = await axios.get(url)
    return response.data.result
}

async function getAppointments(lpuId, doctorId) {
    let url = `https://gorzdrav.spb.ru/_api/api/v2/schedule/lpu/${lpuId}/doctor/${doctorId}/appointments`
    const response = await axios.get(url)
    return response.data.result
}

start()
