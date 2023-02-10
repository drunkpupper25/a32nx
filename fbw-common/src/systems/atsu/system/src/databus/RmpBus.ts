import { EventBus, EventSubscriber, Publisher, SimVarDefinition, SimVarPublisher, SimVarValueType } from 'msfssdk';

interface RmpSimvars {
    msfsTransponderCode: number,
    msfsVhf3Frequency: number,
}

enum RmpSimvarSources {
    transponderCode = 'TRANSPONDER CODE:1',
    vhf3Frequency = 'A:COM ACTIVE FREQUENCY:3',
}

export class RmpSimvarPublisher extends SimVarPublisher<RmpSimvars> {
    private static simvars = new Map<keyof RmpSimvars, SimVarDefinition>([
        ['msfsTransponderCode', { name: RmpSimvarSources.transponderCode, type: SimVarValueType.Number }],
        ['msfsVhf3Frequency', { name: RmpSimvarSources.vhf3Frequency, type: SimVarValueType.MHz }],
    ]);

    public constructor(bus: EventBus) {
        super(RmpSimvarPublisher.simvars, bus);
    }
}

export interface RmpDataBusTypes {
    transponderCode: number,
    vhf3DataMode: boolean,
}

export class RmpInputBus {
    private simVarPublisher: RmpSimvarPublisher = null;

    private subscriber: EventSubscriber<RmpSimvars> = null;

    private publisher: Publisher<RmpDataBusTypes> = null;

    constructor(private readonly bus: EventBus) {
        this.simVarPublisher = new RmpSimvarPublisher(this.bus);
    }

    public initialize(): void {
        this.publisher = this.bus.getPublisher<RmpDataBusTypes>();
        this.subscriber = this.bus.getSubscriber<RmpSimvars>();

        this.subscriber.on('msfsTransponderCode').handle((code: number) => this.publisher.pub('transponderCode', code, true, false));
        this.subscriber.on('msfsVhf3Frequency').whenChanged().handle((frequency: number) => this.publisher.pub('vhf3DataMode', frequency === 0));
    }

    public connectedCallback(): void {
        this.simVarPublisher.subscribe('msfsTransponderCode');
        this.simVarPublisher.subscribe('msfsVhf3Frequency');
    }

    public startPublish(): void {
        this.simVarPublisher.startPublish();
    }

    public update(): void {
        this.simVarPublisher.onUpdate();
    }
}
