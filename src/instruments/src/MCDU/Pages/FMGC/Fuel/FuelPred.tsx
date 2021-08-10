import React, { useEffect, useState } from 'react';

import { useSimVar } from '@instruments/common/simVars';

import { useMCDUDispatch, useMCDUSelector } from '../../../redux/hooks';
import InteractiveSplitField, { fieldProperties } from '../../../Components/Fields/Interactive/InteractiveSplitField';
import { scratchpadMessage, scratchpadState } from '../../../redux/reducers/scratchpadReducer';
import NumberInputField from '../../../Components/Fields/Interactive/NumberInputField';
import { LINESELECT_KEYS } from '../../../Components/Buttons';
import SplitNumberField from '../../../Components/Fields/Interactive/Split/SplitNumberField';
import InteractiveSplitLine from '../../../Components/Lines/InteractiveSplitLine';
import { RowHolder } from '../../../Components/RowHolder';
import { lineColors, lineSides, lineSizes } from '../../../Components/Lines/LineProps';
import { LineHolder } from '../../../Components/LineHolder';
import { LabelField } from '../../../Components/Fields/NonInteractive/LabelField';
import { Field, fieldSides } from '../../../Components/Fields/NonInteractive/Field';
import { EmptyLine } from '../../../Components/Lines/EmptyLine';
import { SplitLine } from '../../../Components/Lines/SplitLine';

import { Content } from '../../../Components/Content';
import * as titlebarActions from '../../../redux/actions/titlebarActionCreators';
import * as scratchpadActions from '../../../redux/actions/scratchpadActionCreators';
import * as mcduActions from '../../../redux/actions/mcduActionCreators';

/**
 * @todo retrieve Dest ICAO when CFPM ready
 */
const DestICAOLine: React.FC = () => (
    <LineHolder>
        <LabelField lineSide={lineSides.left} value="AT" color={lineColors.white} />
        <Field lineSide={lineSides.left} textSide={fieldSides.left} value="NONE" color={lineColors.green} size={lineSizes.regular} />
    </LineHolder>
);

/**
 * @todo retrieve Dest UTC when CFPM ready
 */
const DestTimeLine: React.FC = () => (
    <LineHolder>
        <LabelField lineSide={lineSides.center} value="UTC" color={lineColors.white} />
        <Field lineSide={lineSides.center} value="----" color={lineColors.white} size={lineSizes.regular} />
    </LineHolder>
);

/**
 * @todo retrieve Dest EFOB when CFPM ready
 */
const DestEFOBLine: React.FC = () => (
    <LineHolder>
        <LabelField lineSide={lineSides.right} value="EFOB" color={lineColors.white} />
        <Field lineSide={lineSides.right} textSide={fieldSides.right} value="---.-" color={lineColors.white} size={lineSizes.regular} />
    </LineHolder>
);

/**
 * @todo retrieve Dest ICAO when CFPM ready
 */
const AltICAOLine: React.FC = () => (
    <LineHolder>
        <EmptyLine />
        <Field lineSide={lineSides.left} value="NONE" color={lineColors.green} size={lineSizes.regular} />
    </LineHolder>
);

/**
 * @todo retrieve Dest UTC when CFPM ready
 */
const AltTimeLine: React.FC = () => (
    <LineHolder>
        <EmptyLine />
        <Field lineSide={lineSides.center} value="----" color={lineColors.white} size={lineSizes.regular} />
    </LineHolder>
);

/**
 * @todo retrieve Dest EFOB when CFPM ready
 */
const AltEFOBLine: React.FC = () => (
    <LineHolder>
        <EmptyLine />
        <Field lineSide={lineSides.center} textSide={fieldSides.right} value="---.-" color={lineColors.white} size={lineSizes.regular} />
    </LineHolder>
);

const RteRsvLine: React.FC = () => {
    const rteRsvWeight = '---.-';
    const rteRsvPercent = '--.-';
    return (
        <LineHolder>
            <LabelField lineSide={lineSides.left} value="RTE RSV/ %" color={lineColors.white} />
            <SplitLine
                side={lineSides.left}
                slashColor={lineColors.white}
                leftSide={<Field lineSide={lineSides.left} value={rteRsvWeight} color={lineColors.white} size={lineSizes.small} />}
                rightSide={<Field lineSide={lineSides.left} value={rteRsvPercent} color={lineColors.white} size={lineSizes.small} />}
            />
        </LineHolder>
    );
};

type zfwLineProps = {
    fmgcZFW: number | undefined,
    setFMGCZFW: React.Dispatch<React.SetStateAction<number | undefined>>
    fmgcZFWCG: number | undefined,
    setFMGCZFWCG: React.Dispatch<React.SetStateAction<number | undefined>>
    zeroFuelWeightZFWCGEntered: Boolean,
    setZeroFuelWeightZFWCGEntered: React.Dispatch<React.SetStateAction<boolean>>,
    lsk: LINESELECT_KEYS,
    // Redux
    setScratchpad: (msg: any) => any
    addMessage: (msg: scratchpadMessage) => any
    scratchpad: scratchpadState
}
export const ZfwLine: React.FC<zfwLineProps> = (
    {
        zeroFuelWeightZFWCGEntered,
        setZeroFuelWeightZFWCGEntered,
        scratchpad,
        addMessage,
        setScratchpad,
        fmgcZFW,
        setFMGCZFW,
        fmgcZFWCG,
        setFMGCZFWCG,
        lsk,
    },
) => {
    // TODO Move to util?
    const [fuelQuantity, _] = useSimVar('FUEL TOTAL QUANTITY', 'gallons');
    const [fuelWeight, __] = useSimVar('FUEL WEIGHT PER GALLON', 'kilograms');
    const [totalWeight, ___] = useSimVar('TOTAL WEIGHT', 'kilograms');
    const [calcZFWCG, ____] = useSimVar('CG PERCENT', 'percent');
    const blockFuel = fuelQuantity * fuelWeight / 1000;
    const calcZFW = (totalWeight / 1000) - blockFuel;

    const properties: fieldProperties = {
        lValue: fmgcZFW === undefined ? '___._' : fmgcZFW.toFixed(1),
        // lSide: fieldSides.left,
        lColour: fmgcZFW === undefined ? lineColors.amber : lineColors.cyan,
        lSize: lineSizes.regular,
        rValue: fmgcZFWCG === undefined ? '__._ ' : `${fmgcZFWCG.toFixed(1)} `,
        // rSide: fieldSides.right,
        rColour: fmgcZFW === undefined ? lineColors.amber : lineColors.cyan,
        rSize: lineSizes.regular,
    };

    // TODO make this a util?
    const isZFWInRange = (zfw: number) => zfw >= 35.0 && zfw <= 80.0;
    const isZFWCGInRange = (zfwcg: number) => (zfwcg >= 8.0 && zfwcg <= 50.0);

    const validateEntry = (lVal: string, rVal: string) => {
        const newZFW = parseFloat(lVal);
        const newZFWCG = parseFloat(rVal);

        // If both sides contain a number (e.g 23.0/24.0)
        if (Number.isFinite(newZFW) && Number.isFinite(newZFWCG)) {
            if (isZFWInRange(newZFW) && isZFWCGInRange(newZFWCG)) {
                return true;
            }
            addMessage({
                text: 'ENTRY OUT OF RANGE',
                isAmber: false,
                isTypeTwo: false,
            });
            return false;
        }

        // If you've reached this point and not entered both zfw/zfwCG then, false
        if (!zeroFuelWeightZFWCGEntered) {
            addMessage({
                text: 'NOT ALLOWED',
                isAmber: false,
                isTypeTwo: false,
            });
            return false;
        }
        if (Number.isFinite(newZFW)) {
            if (isZFWInRange(newZFW)) {
                return true;
            }
            addMessage({
                text: 'ENTRY OUT OF RANGE',
                isAmber: false,
                isTypeTwo: false,
            });
            return false;
        }
        // If right side contains a number (e.g /23.0)
        if (Number.isFinite(newZFWCG)) {
            if (isZFWCGInRange(newZFWCG)) {
                return true;
            }
            addMessage({
                text: 'ENTRY OUT OF RANGE',
                isAmber: false,
                isTypeTwo: false,
            });
            return false;
        }
        addMessage({
            text: 'FORMAT ERROR',
            isAmber: false,
            isTypeTwo: false,
        });
        return false;
    };

    const updateFMGC = (lVal: string, rVal: string) => {
        if (scratchpad.currentMessage === 'CLR') {
            addMessage({
                text: 'NOT ALLOWED',
                isAmber: false,
                isTypeTwo: false,
            });
        } else {
            if (lVal !== '' && rVal !== '' && rVal !== undefined) {
                setZeroFuelWeightZFWCGEntered(true);
                setFMGCZFW(parseFloat(lVal));
                setFMGCZFWCG(parseFloat(rVal));
            }
            if (lVal !== '') {
                setFMGCZFW(parseFloat(lVal));
            }
            if (rVal !== '' && rVal !== undefined) {
                setFMGCZFWCG(parseFloat(rVal));
            }
        }
    };

    return (
        <LineHolder>
            <LabelField lineSide={lineSides.right} value="ZFW/ZFWCG" color={lineColors.white} />
            <InteractiveSplitField
                side={lineSides.right}
                slashColor={fmgcZFW === undefined ? lineColors.amber : lineColors.cyan}
                lsk={lsk}
                properties={properties}
                selectedValidation={(lVal, rVal) => validateEntry(lVal, rVal)}
                selectedCallback={(lVal, rVal) => updateFMGC(lVal, rVal)}
                autoCalc={() => {
                    setScratchpad(`${calcZFW.toFixed(1)}/${calcZFWCG.toFixed(1)}`);
                }}
            />
        </LineHolder>
    );
};

type altneLineProps = {
    clearScratchpad: () => any,
}
/**
 * @todo set the max alternate fuel to block - trip fuel
 * @todo when connected to FMGC check if altn value has been enetered or not
 */
const AltnLine: React.FC<altneLineProps> = ({ clearScratchpad }) => {
    const [altnWeight, setAltnWeight] = useState<number>();
    const altnTime = altnWeight === undefined ? '----' : '0000';
    return (
        <LineHolder>
            <LabelField lineSide={lineSides.right} value="ALTN /TIME" color={lineColors.white} />
            <InteractiveSplitLine
                lsk={LINESELECT_KEYS.L4}
                slashColor={lineColors.white}
                leftSide={(
                    <SplitNumberField
                        nullValue="---.-"
                        min={0}
                        max={10}
                        value={altnWeight}
                        color={lineColors.white}
                        size={altnWeight === undefined ? lineSizes.small : lineSizes.regular}
                        selectedCallback={(value) => {
                            if (value === undefined) {
                                setAltnWeight(undefined);
                            } else {
                                setAltnWeight(+value);
                            }
                            clearScratchpad();
                        }}
                    />
                )}
                rightSide={<Field lineSide={lineSides.right} value={altnTime} color={altnWeight === undefined ? lineColors.white : lineColors.green} size={lineSizes.small} />}
            />
        </LineHolder>
    );
};

type fobLineProps = {
    zfwEntered: boolean,
}
/**
 * @todo Make this interactive
 */
const FobLine: React.FC<fobLineProps> = ({ zfwEntered }) => {
    const [fob, _] = useSimVar('FUEL TOTAL QUANTITY WEIGHT', 'POUND');
    const fobWeight = zfwEntered ? ((fob * 0.453592) / 1000).toFixed(1) : '---.-';
    const fobOther = zfwEntered ? '    FF' : '----';
    const color = zfwEntered ? lineColors.cyan : lineColors.white;

    return (
        <LineHolder>
            <LabelField lineSide={lineSides.right} value="FOB    " color={lineColors.white} />
            <SplitLine
                side={lineSides.right}
                slashColor={color}
                leftSide={<Field lineSide={lineSides.right} value={fobWeight} color={color} size={lineSizes.small} />}
                rightSide={<Field lineSide={lineSides.right} value={fobOther} color={color} size={lineSizes.small} />}
            />
        </LineHolder>
    );
};

type finalLineProps = {
    // Redux
    clearScratchpad: () => any
}
const FinalLine: React.FC<finalLineProps> = ({ clearScratchpad }) => {
    const [fuelWeight, setFuelWeight] = useState<number>();
    const [fuelTime, setFuelTime] = useState<number>();

    return (
        <LineHolder>
            <LabelField lineSide={lineSides.right} value="FINAL/TIME" color={lineColors.white} />
            <InteractiveSplitLine
                lsk={LINESELECT_KEYS.L5}
                slashColor={lineColors.white}
                leftSide={(
                    <SplitNumberField
                        side={fieldSides.right}
                        value={fuelWeight?.toString(1)}
                        nullValue="---.-"
                        min={35.0}
                        max={80.0}
                        color={fuelWeight === undefined ? lineColors.white : lineColors.cyan}
                        size={fuelWeight === undefined ? lineSizes.small : lineSizes.regular}
                        selectedCallback={(value) => {
                            if (value === undefined) {
                                setFuelWeight(undefined);
                            } else {
                                setFuelWeight(+value);
                            }
                            clearScratchpad();
                        }}
                    />
                )}
                rightSide={(
                    <SplitNumberField
                        side={fieldSides.right}
                        value={fuelTime?.toFixed(0)}
                        nullValue="----"
                        min={0}
                        max={9999}
                        color={fuelTime === undefined ? lineColors.white : lineColors.cyan}
                        size={lineSizes.regular}
                        selectedCallback={(value) => {
                            if (value === undefined) {
                                setFuelTime(undefined);
                            } else {
                                setFuelTime(+value);
                            }
                            clearScratchpad();
                        }}
                    />
                )}
            />
        </LineHolder>
    );
};
type gWCGLineProps = {
    zfwEntered: boolean,
}
const GWCGLine: React.FC<gWCGLineProps> = ({ zfwEntered: zfw }) => {
    const [gw, _] = useSimVar('', 'Pounds');
    const [cg, __] = useSimVar('', 'Percent over 100');
    const gwVal = zfw ? ((gw * 0.45359237) / 1000).toFixed(1) : '---.-';
    const cgVal = zfw ? (cg * 100).toFixed(1) : '--.-';
    const color = zfw ? lineColors.green : lineColors.white;

    return (
        <LineHolder>
            <LabelField lineSide={lineSides.right} value="GW    CG" color={lineColors.white} />
            <SplitLine
                side={lineSides.right}
                slashColor={lineColors.white}
                leftSide={<Field lineSide={lineSides.right} value={gwVal} color={color} size={lineSizes.small} />}
                rightSide={<Field lineSide={lineSides.right} value={` ${cgVal}`} color={color} size={lineSizes.small} />}
            />
        </LineHolder>
    );
};

type minDestFobLineProps = {
    zfwEntered: Boolean
    // Redux
    clearScratchpad: () => any
}
/**
 * @todo adjust size when the value is computed or entered (needs FMGC)
 */
const MinDestFobLine: React.FC<minDestFobLineProps> = ({ zfwEntered }) => {
    const [minDestFob, setMinDestFob] = useState<string>();
    const [valEntered, setValEntered] = useState(false);
    const color = minDestFob === undefined ? lineColors.white : lineColors.cyan;
    const size = valEntered === false ? lineSizes.small : lineSizes.regular;

    return (
        <LineHolder>
            <LabelField lineSide={lineSides.left} value="MIN DEST FOB" color={lineColors.white} />
            <NumberInputField
                lineSide={lineSides.right}
                fieldSide={fieldSides.left}
                lsk={LINESELECT_KEYS.L6}
                min={0}
                max={80.0}
                nullValue="---.-"
                value={minDestFob}
                color={color}
                size={size}
                prevEntered={zfwEntered}
                selectedCallback={((value) => {
                    if (value === undefined) {
                        // TODO when FMGC is coupled retrieve the computed value instead
                        setMinDestFob(undefined);
                        setValEntered(false);
                    } else {
                        setMinDestFob(value);
                        setValEntered(true);
                    }
                })}
            />
        </LineHolder>
    );
};

type extraLineProps = {
    zfwEntered: boolean
}
const ExtraLine: React.FC<extraLineProps> = ({ zfwEntered }) => {
    const extraFuel = zfwEntered ? '    0.0' : '---.-';
    const extraTime = zfwEntered ? '0000' : '---.-';
    const color = zfwEntered ? lineColors.green : lineColors.white;

    return (
        <LineHolder>
            <LabelField lineSide={lineSides.right} value="EXTRA TIME" color={lineColors.white} />
            <SplitLine
                side={lineSides.right}
                slashColor={lineColors.white}
                leftSide={<Field lineSide={lineSides.right} value={extraFuel} color={color} size={lineSizes.small} />}
                rightSide={<Field lineSide={lineSides.right} value={extraTime} color={color} size={lineSizes.small} />}
            />
        </LineHolder>
    );
};

const FuelPredPage: React.FC = () => {
    // TODO connect this up with the FMGC when it's avail
    const dispatch = useMCDUDispatch();

    // REDUX
    const mcduData = useMCDUSelector((state) => state.mcduData);
    const setZFW = (msg: number | undefined) => {
        dispatch(mcduActions.setZFW(msg));
    };
    const setZFWCG = (msg: number | undefined) => {
        dispatch(mcduActions.setZFWCG(msg));
    };
    const setZFWCGEntered = (entered: boolean) => {
        dispatch(mcduActions.setZFWCGEntered(entered));
    };

    const scratchpad = useMCDUSelector((state) => state.scratchpad);
    const setScratchpad = (msg: string) => {
        dispatch(scratchpadActions.setScratchpad(msg));
    };

    const addScratchpadMessage = (msg: scratchpadMessage) => {
        dispatch(scratchpadActions.addScratchpadMessage(msg));
    };
    const clearScratchpad = () => {
        dispatch(scratchpadActions.clearScratchpad());
    };

    const setTitlebarText = (msg: string) => {
        dispatch(titlebarActions.setTitleBarText(msg));
    };

    const setTitlebarColor = (color : lineColors) => {
        dispatch(titlebarActions.setTitleBarColor(color));
    };

    const setTitlebarSide = (side : lineSides) => {
        dispatch(titlebarActions.setTitleBarSide(side));
    };

    useEffect(() => {
        setTitlebarText('FUEL PRED');
        setTitlebarColor(lineColors.white);
        setTitlebarSide(lineSides.center);
    }, []);
    return (
        <>
            <Content>
                <RowHolder index={1}>
                    <DestICAOLine />
                    <DestTimeLine />
                    <DestEFOBLine />
                </RowHolder>
                <RowHolder index={2}>
                    <AltICAOLine />
                    <AltTimeLine />
                    <AltEFOBLine />
                </RowHolder>
                <RowHolder index={3}>
                    <RteRsvLine />
                    <ZfwLine
                        lsk={LINESELECT_KEYS.R3}
                        addMessage={addScratchpadMessage}
                        setScratchpad={setScratchpad}
                        fmgcZFW={mcduData.zfw}
                        setFMGCZFW={setZFW}
                        fmgcZFWCG={mcduData.zfwCG}
                        setFMGCZFWCG={setZFWCG}
                        scratchpad={scratchpad}
                        zeroFuelWeightZFWCGEntered={mcduData.zfwCGEntered}
                        setZeroFuelWeightZFWCGEntered={setZFWCGEntered}
                    />
                </RowHolder>
                <RowHolder index={4}>
                    <AltnLine clearScratchpad={clearScratchpad} />
                    <FobLine zfwEntered={mcduData.zfwCGEntered} />
                </RowHolder>
                <RowHolder index={5}>
                    <FinalLine clearScratchpad={clearScratchpad} />
                    <GWCGLine zfwEntered={mcduData.zfwCGEntered} />
                </RowHolder>
                <RowHolder index={6}>
                    <MinDestFobLine clearScratchpad={clearScratchpad} zfwEntered={mcduData.zfwCGEntered} />
                    <ExtraLine zfwEntered={mcduData.zfwCGEntered} />
                </RowHolder>
            </Content>
        </>
    );
};
export default FuelPredPage;