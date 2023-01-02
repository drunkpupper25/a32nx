import { EventBus, Publisher, SimVarDefinition, SimVarPublisher, SimVarValueType } from 'msfssdk';

interface AtcMessageButtonSimvars {
    msfsButtonActive: boolean,
    msfsButtonPressed: number,
}

enum AtcMessageButtonSimvarSources {
    buttonActive = 'L:A32NX_DCDU_ATC_MSG_WAITING',
    buttonPressed = 'L:A32NX_DCDU_ATC_MSG_ACK',
}

export class AtcMessageButtonSimvarPublisher extends SimVarPublisher<AtcMessageButtonSimvars> {
    private static simvars = new Map<keyof AtcMessageButtonSimvars, SimVarDefinition>([
        ['msfsButtonActive', { name: AtcMessageButtonSimvarSources.buttonActive, type: SimVarValueType.Bool }],
        ['msfsButtonPressed', { name: AtcMessageButtonSimvarSources.buttonPressed, type: SimVarValueType.Number }],
    ]);

    public constructor(bus: EventBus) {
        super(AtcMessageButtonSimvarPublisher.simvars, bus);
    }
}

export interface AtcMessageButtonBusTypes {
    buttonActive: boolean,
    buttonPressed: boolean,
}

export class AtcMessageButtonInputBus {
    private simVarPublisher: AtcMessageButtonSimvarPublisher = null;

    constructor(private readonly bus: EventBus) { }

    public initialize(): void {
        const publisher = this.bus.getPublisher<AtcMessageButtonBusTypes>();
        const subscriber = this.bus.getSubscriber<AtcMessageButtonSimvars>();

        subscriber.on('msfsButtonActive').whenChanged().handle((active: boolean) => publisher.pub('buttonActive', active));
        subscriber.on('msfsButtonPressed').whenChanged().handle((pressed: number) => publisher.pub('buttonPressed', pressed !== 0));

        this.simVarPublisher = new AtcMessageButtonSimvarPublisher(this.bus);
    }

    public connectedCallback(): void {
        this.simVarPublisher.subscribe('msfsButtonActive');
        this.simVarPublisher.subscribe('msfsButtonPressed');
    }
}

export class AtcMessageButtonOutputBus {
    private publisher: Publisher<AtcMessageButtonSimvars> = null;

    constructor(private readonly bus: EventBus) { }

    public initialize(): void {
        this.publisher = this.bus.getPublisher<AtcMessageButtonSimvars>();
    }

    public activateButton(): void {
        this.publisher.pub('msfsButtonActive', true);
    }

    public resetButton(): void {
        this.publisher.pub('msfsButtonActive', false);
        this.publisher.pub('msfsButtonPressed', 0);
    }
}