import { AtsuStatusCodes } from '@atsu/common/AtsuStatusCodes';
import { AtsuFmsMessages, AtsuFmsMessageSyncType, FmsRouteData } from '@atsu/common/databus';
import { FansMode } from '@atsu/common/index';
import { AtisMessage, AtisType, AtsuMessage, CpdlcMessage, WeatherMessage } from '@atsu/common/messages';
import { PositionReportData } from '@atsu/common/types';
import { EventBus, EventSubscriber, Publisher } from 'msfssdk';

export type FmsBusCallbacks = {
    flightRoute: (route: FmsRouteData) => void;
    sendMessage: (message: AtsuMessage) => Promise<AtsuStatusCodes>;
    updateMessage: (message: AtsuMessage) => void;
    remoteStationAvailable: (station: string) => Promise<AtsuStatusCodes>;
    atcLogon: (station: string) => Promise<AtsuStatusCodes>;
    atcLogoff: () => Promise<AtsuStatusCodes>;
    connectToNetworks: (callsign: string) => Promise<AtsuStatusCodes>;
    activateAtisAutoUpdate: (data: { icao: string; type: AtisType }) => void;
    deactivateAtisAutoUpdate: (icao: string) => void;
    togglePrintAtisReportsPrint: () => void;
    setMaxUplinkDelay: (delay: number) => void;
    toggleAutomaticPositionReport: () => void;
    requestAtis: (icao: string, type: AtisType, sentCallback: () => void) => Promise<[AtsuStatusCodes, WeatherMessage]>;
    requestWeather: (icaos: string[], requestMetar: boolean, sentCallback: () => void) => Promise<[AtsuStatusCodes, WeatherMessage]>;
    positionReportData: () => PositionReportData;
    registerMessages: (messages: AtsuMessage[]) => void;
    messageRead: (uid: number) => void;
    removeMessage: (uid: number) => void;
    cleanupAtcMessages: () => void;
    resetAtisAutoUpdate: () => void;
}

export class FmsInputBus {
    private readonly subscriber: EventSubscriber<AtsuFmsMessages>;

    private readonly publisher: Publisher<AtsuFmsMessages>;

    private callbacks: FmsBusCallbacks = {
        flightRoute: null,
        sendMessage: null,
        updateMessage: null,
        remoteStationAvailable: null,
        atcLogon: null,
        atcLogoff: null,
        connectToNetworks: null,
        activateAtisAutoUpdate: null,
        deactivateAtisAutoUpdate: null,
        togglePrintAtisReportsPrint: null,
        setMaxUplinkDelay: null,
        toggleAutomaticPositionReport: null,
        requestAtis: null,
        requestWeather: null,
        positionReportData: null,
        registerMessages: null,
        messageRead: null,
        removeMessage: null,
        cleanupAtcMessages: null,
        resetAtisAutoUpdate: null,
    };

    private async requestWithStatusResponse<T>(value: T, requestId: number, callback: (value: T) => Promise<AtsuStatusCodes>): Promise<void> {
        if (callback !== null) {
            callback(value).then((code) => {
                this.publisher.pub('requestAtsuStatusCode', { requestId, code });
            });
        }
    }

    private async synchronizeMessage<T extends AtsuMessage>(data: { message: T; type: AtsuFmsMessageSyncType; requestId: number }): Promise<void> {
        if (data.type === AtsuFmsMessageSyncType.SendMessage) {
            this.requestWithStatusResponse(data.message, data.requestId, this.callbacks.sendMessage);
        } else if (data.type === AtsuFmsMessageSyncType.UpdateMessage) {
            if (this.callbacks.updateMessage !== null) {
                this.callbacks.updateMessage(data.message);
            }
            this.publisher.pub('requestAtsuStatusCode', { requestId: data.requestId, code: AtsuStatusCodes.Ok });
        }
    }

    private requestWithParameter<T>(value: T, requestId: number, callback: (value: T) => void): void {
        if (callback !== null) {
            callback(value);
            this.publisher.pub('genericRequestResponse', requestId);
        }
    }

    private requestWithoutParameter(requestId: number, callback: () => void): void {
        if (callback !== null) {
            callback();
            this.publisher.pub('genericRequestResponse', requestId);
        }
    }

    private fireAndForgetWithParameter<T>(value: T, callback: (value: T) => void): void {
        if (callback !== null) callback(value);
    }

    private fireAndForgetWithoutParameter(callback: () => void): void {
        if (callback !== null) callback();
    }

    constructor(private readonly bus: EventBus) {
        this.subscriber = this.bus.getSubscriber<AtsuFmsMessages>();
        this.publisher = this.bus.getPublisher<AtsuFmsMessages>();
    }

    public initialize(): void {
        this.subscriber.on('synchronizeAtisMessage').handle((data) => this.synchronizeMessage(data));
        this.subscriber.on('synchronizeCpdlcMessage').handle((data) => this.synchronizeMessage(data));
        this.subscriber.on('synchronizeDclMessage').handle((data) => this.synchronizeMessage(data));
        this.subscriber.on('synchronizeFreetextMessage').handle((data) => this.synchronizeMessage(data));
        this.subscriber.on('synchronizeMetarMessage').handle((data) => this.synchronizeMessage(data));
        this.subscriber.on('synchronizeOclMessage').handle((data) => this.synchronizeMessage(data));
        this.subscriber.on('synchronizeTafMessage').handle((data) => this.synchronizeMessage(data));
        this.subscriber.on('remoteStationAvailable').handle((data) => this.requestWithStatusResponse(data.station, data.requestId, this.callbacks.remoteStationAvailable));
        this.subscriber.on('atcLogon').handle((data) => this.requestWithStatusResponse(data.station, data.requestId, this.callbacks.atcLogon));
        this.subscriber.on('atcLogoff').handle((data) => {
            if (this.callbacks.atcLogoff !== null) {
                this.callbacks.atcLogoff().then((code) => {
                    this.publisher.pub('requestAtsuStatusCode', { requestId: data, code });
                });
            }
        });
        this.subscriber.on('connectToNetworks').handle((data) => this.requestWithStatusResponse(data.callsign, data.requestId, this.callbacks.connectToNetworks));
        this.subscriber.on('activateAtisAutoUpdate').handle((data) => this.requestWithParameter(data, data.requestId, this.callbacks.activateAtisAutoUpdate));
        this.subscriber.on('deactivateAtisAutoUpdate').handle((data) => this.requestWithParameter(data.icao, data.requestId, this.callbacks.deactivateAtisAutoUpdate));
        this.subscriber.on('togglePrintAtisReportsPrint').handle((data) => this.requestWithoutParameter(data, this.callbacks.togglePrintAtisReportsPrint));
        this.subscriber.on('setMaxUplinkDelay').handle((data) => this.requestWithParameter(data.delay, data.requestId, this.callbacks.setMaxUplinkDelay));
        this.subscriber.on('toggleAutomaticPositionReport').handle((data) => this.requestWithoutParameter(data, this.callbacks.toggleAutomaticPositionReport));
        this.subscriber.on('requestAtis').handle((data) => {
            if (this.callbacks.requestAtis !== null) {
                this.callbacks.requestAtis(data.icao, data.type, () => this.publisher.pub('requestSentToGround', data.requestId)).then((response) => {
                    this.publisher.pub('weatherResponse', { requestId: data.requestId, data: response });
                });
            }
        });
        this.subscriber.on('requestWeather').handle((data) => {
            if (this.callbacks.requestWeather !== null) {
                this.callbacks.requestWeather(data.icaos, data.requestMetar, () => this.publisher.pub('requestSentToGround', data.requestId)).then((response) => {
                    this.publisher.pub('weatherResponse', { requestId: data.requestId, data: response });
                });
            }
        });
        this.subscriber.on('requestPositionReport').handle((data) => {
            if (this.callbacks.positionReportData !== null) {
                this.publisher.pub('positionReport', { requestId: data, data: this.callbacks.positionReportData() });
            }
        });
        this.subscriber.on('registerAtisMessages').handle((data) => this.fireAndForgetWithParameter(data, this.callbacks.registerMessages));
        this.subscriber.on('registerCpdlcMessages').handle((data) => this.fireAndForgetWithParameter(data, this.callbacks.registerMessages));
        this.subscriber.on('registerDclMessages').handle((data) => this.fireAndForgetWithParameter(data, this.callbacks.registerMessages));
        this.subscriber.on('registerOclMessages').handle((data) => this.fireAndForgetWithParameter(data, this.callbacks.registerMessages));
        this.subscriber.on('registerWeatherMessages').handle((data) => this.fireAndForgetWithParameter(data, this.callbacks.registerMessages));
        this.subscriber.on('messageRead').handle((data) => this.fireAndForgetWithParameter(data, this.callbacks.messageRead));
        this.subscriber.on('removeMessage').handle((data) => this.fireAndForgetWithParameter(data, this.callbacks.removeMessage));
        this.subscriber.on('cleanupAtcMessages').handle(() => this.fireAndForgetWithoutParameter(this.callbacks.cleanupAtcMessages));
        this.subscriber.on('resetAtisAutoUpdate').handle(() => this.fireAndForgetWithoutParameter(this.callbacks.resetAtisAutoUpdate));
    }

    public addDataCallback<K extends keyof FmsBusCallbacks>(event: K, callback: FmsBusCallbacks[K]): void {
        this.callbacks[event] = callback;
    }

    public newRouteDataReceived(route: FmsRouteData): void {
        if (this.callbacks.flightRoute !== null) {
            this.callbacks.flightRoute(route);
        }
    }
}

export class FmsOutputBus {
    private readonly publisher: Publisher<AtsuFmsMessages>;

    constructor(private readonly bus: EventBus) {
        this.publisher = this.bus.getPublisher<AtsuFmsMessages>();
    }

    public sendAtsuSystemStatus(status: AtsuStatusCodes): void {
        this.publisher.pub('atsuSystemStatus', status);
    }

    public sendMessageModify(message: CpdlcMessage): void {
        this.publisher.pub('messageModify', message);
    }

    public sendPrintMessage(message: AtsuMessage): void {
        this.publisher.pub('printMessage', message);
    }

    public sendActiveAtisAutoUpdates(icaos: string[]): void {
        this.publisher.pub('activeAtisAutoUpdates', icaos);
    }

    public sendAtcAtisReports(reports: Map<string, AtisMessage[]>): void {
        this.publisher.pub('atcAtisReports', reports);
    }

    public sendPrintAtisReportsPrint(active: boolean): void {
        this.publisher.pub('printAtisReportsPrint', active);
    }

    public sendAtcConnectionStatus(status: { current: string; next: string; notificationTime: number; mode: FansMode; logonInProgress: boolean }): void {
        this.publisher.pub('atcStationStatus', status);
    }

    public sendAocUplinkMessages(messages: AtsuMessage[]): void {
        this.publisher.pub('aocUplinkMessages', messages);
    }

    public sendAocDownlinkMessages(messages: AtsuMessage[]): void {
        this.publisher.pub('aocDownlinkMessages', messages);
    }

    public sendAtcMessages(messages: CpdlcMessage[]): void {
        this.publisher.pub('atcMessages', messages);
    }

    public sendMonitoredMessages(messages: CpdlcMessage[]): void {
        this.publisher.pub('monitoredMessages', messages);
    }

    public sendMaxUplinkDelay(delay: number): void {
        this.publisher.pub('maxUplinkDelay', delay);
    }

    public sendAutomaticPositionReportActive(active: boolean): void {
        this.publisher.pub('automaticPositionReportActive', active);
    }
}