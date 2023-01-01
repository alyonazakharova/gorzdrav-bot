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
    isAppointmentSelected = false
    lpuId
    specialtyId
    doctorId
    appointmentId
}

var usersMap = new Map()

const start = () => {
    bot.setMyCommands([
        {command: '/info', description: 'Показать, что может этот бот'},
        {command: '/schedule', description: 'Записаться к врачу'}
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

            // FIXME
            reply = `SELECTED DISTRICT ID IS ${districtId}`
            bot.sendMessage(chatId, reply)

            let lpus = await getLpus(districtId)

            reply = 'В выбранном вами районе доступны следующие медецинские учреждения:'
            _.forEach(lpus, function (lpu) {
                reply += `\n\n${lpu.lpuFullName} (${lpu.lpuShortName})\n${lpu.address}`
            })
            reply += '\n\nВыберите подходящее учреждение:'

            let lpuOptions = getLpuOptions(lpus)
            return bot.sendMessage(chatId, reply, lpuOptions)
        } else if (!processInfo.isLpuSelected) {
            processInfo.isLpuSelected = true
            processInfo.lpuId = msg.data

            // FIXME
            reply = `SELECTED LPU ID IS ${processInfo.lpuId}`
            bot.sendMessage(chatId, reply)

            let specialties = await getSpecialties(processInfo.lpuId)
            let specialtyOptions = getSpecialtyOptions(specialties)
            reply = 'Выберите специализацию'
            return bot.sendMessage(chatId, reply, specialtyOptions)
        } else if (!processInfo.isSpecialtySelected) {
            processInfo.isSpecialtySelected = true
            processInfo.specialtyId = msg.data

            // FIXME
            reply = `SELECTED LPU ID IS ${processInfo.lpuId} AND SELECTED SPECIALTY ID IS ${processInfo.specialtyId}`
            bot.sendMessage(chatId, reply)

            let doctors = await getDoctors(processInfo.lpuId, processInfo.specialtyId)
            let doctorOptions = getDoctorOptions(doctors)

            // TODO добавить сообщение об отсутствии номерков (можно и у специализий)

            reply = 'Выберите врача'
            return bot.sendMessage(chatId, reply, doctorOptions)
        } else if (!processInfo.isDoctorSelected) {
            processInfo.isDoctorSelected = true
            processInfo.doctorId = msg.data

            // FIXME
            bot.sendMessage(chatId, "SELECTED DOCTOR ID IS " + processInfo.doctorId)

            let appointments = await getAppointments(processInfo.lpuId, processInfo.doctorId)
            // FIXME !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            let appointemntOptions = getAppointmentOptions(appointments)

            reply = 'Выберите подходящую дату и время'
            return bot.sendMessage(chatId, reply, appointemntOptions)
        } else if (!processInfo.isDateSelected) {
            processInfo.isDateSelected = true
            processInfo.appointmentId = msg.data

            return bot.sendMessage(chatId, `SELECTED APPOINTMENT ID IS ${processInfo.appointmentId}`)
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

function getSpecialtyOptions(specialties) {
    let specialtyOptions = new Array(specialties.length)
    for (let i = 0; i < specialties.length; i++) {
        specialtyOptions[i] =  [{text: specialties[i].name, callback_data: specialties[i].id}]
    }
    return {"reply_markup": JSON.stringify({inline_keyboard: specialtyOptions})}
}

async function getDoctors(lpuId, specialtyId) {
    let url = `https://gorzdrav.spb.ru/_api/api/v2/schedule/lpu/${lpuId}/speciality/${specialtyId}/doctors`
    const response = await axios.get(url)
    return response.data.result
}

function getDoctorOptions(doctors) {
    let doctorOptions = new Array(doctors.length)
    for (let i = 0; i < doctors.length; i++) {
        doctorOptions[i] =  [{text: doctors[i].name, callback_data: doctors[i].id}]
    }
    return {"reply_markup": JSON.stringify({inline_keyboard: doctorOptions})}
}

async function getAppointments(lpuId, doctorId) {
    let url = `https://gorzdrav.spb.ru/_api/api/v2/schedule/lpu/${lpuId}/doctor/${doctorId}/appointments`
    const response = await axios.get(url)
    if (!response.data.success) {
        // TODO handle error
        console.log(response.data.message)
        return null
    } else {
        return response.data.result
    }
}

function getAppointmentOptions(appointemnts) {
    let appointmentOptions = new Array(appointemnts.length)
    for (let i = 0; i < appointemnts.length; i++) {
        appointmentOptions[i] =  [{text: appointemnts[i].visitStart, callback_data: appointemnts[i].id}]
    }
    return {"reply_markup": JSON.stringify({inline_keyboard: appointmentOptions})}
}

start()
