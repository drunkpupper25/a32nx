#include <iostream>
#include <string>

#include "SimConnectData.h"
#include "SimConnectInterface.h"

bool SimConnectInterface::connect() {
  std::cout << "TERR ON ND: Connecting..." << std::endl;

  HRESULT result = SimConnect_Open(&this->hSimConnect, "TerrOnND", nullptr, 0, 0, 0);

  if (S_OK == result) {
    this->isConnected = true;
    std::cout << "TERR ON ND: Connected" << std::endl;

    bool prepareResult = this->prepareTerrOnNdThresholdDataDefinition();

    if (!prepareResult) {
      std::cout << "TERR ON ND: Unable to prepare data definitions" << std::endl;
      this->disconnect();
      return false;
    }

    return true;
  }

  std::cout << "TERR ON ND: Unable to connect" << std::endl;
  return false;
}

void SimConnectInterface::disconnect() {
  if (this->isConnected) {
    SimConnect_Close(this->hSimConnect);
    this->isConnected = false;
    this->hSimConnect = 0;
    std::cout << "TERR ON ND: Disconnected" << std::endl;
  }
}

bool SimConnectInterface::update() {
  return this->readData();
}

bool SimConnectInterface::prepareTerrOnNdThresholdDataDefinition() {
  HRESULT result;

  result = SimConnect_MapClientDataNameToID(this->hSimConnect, "FBW_SIMBRIDGE_TERRONND_THRESHOLDS",
                                            ClientData::FBW_SIMBRIDGE_TERRONND_THRESHOLDS);

  result &= SimConnect_CreateClientData(this->hSimConnect, ClientData::FBW_SIMBRIDGE_TERRONND_THRESHOLDS, sizeof(TerrOnNdThresholds),
                                        SIMCONNECT_CREATE_CLIENT_DATA_FLAG_DEFAULT);

  result &= SimConnect_AddToClientDataDefinition(this->hSimConnect, ClientData::FBW_SIMBRIDGE_TERRONND_THRESHOLDS,
                                                 SIMCONNECT_CLIENTDATAOFFSET_AUTO, SIMCONNECT_CLIENTDATATYPE_INT16);
  result &= SimConnect_AddToClientDataDefinition(this->hSimConnect, ClientData::FBW_SIMBRIDGE_TERRONND_THRESHOLDS,
                                                 SIMCONNECT_CLIENTDATAOFFSET_AUTO, SIMCONNECT_CLIENTDATATYPE_INT16);
  result &= SimConnect_AddToClientDataDefinition(this->hSimConnect, ClientData::FBW_SIMBRIDGE_TERRONND_THRESHOLDS,
                                                 SIMCONNECT_CLIENTDATAOFFSET_AUTO, SIMCONNECT_CLIENTDATATYPE_INT16);
  result &= SimConnect_AddToClientDataDefinition(this->hSimConnect, ClientData::FBW_SIMBRIDGE_TERRONND_THRESHOLDS,
                                                 SIMCONNECT_CLIENTDATAOFFSET_AUTO, SIMCONNECT_CLIENTDATATYPE_INT8);
  result &= SimConnect_AddToClientDataDefinition(this->hSimConnect, ClientData::FBW_SIMBRIDGE_TERRONND_THRESHOLDS,
                                                 SIMCONNECT_CLIENTDATAOFFSET_AUTO, SIMCONNECT_CLIENTDATATYPE_INT16);
  result &= SimConnect_AddToClientDataDefinition(this->hSimConnect, ClientData::FBW_SIMBRIDGE_TERRONND_THRESHOLDS,
                                                 SIMCONNECT_CLIENTDATAOFFSET_AUTO, SIMCONNECT_CLIENTDATATYPE_INT8);

  result &= SimConnect_RequestClientData(this->hSimConnect, ClientData::FBW_SIMBRIDGE_TERRONND_THRESHOLDS,
                                         ClientData::FBW_SIMBRIDGE_TERRONND_THRESHOLDS, ClientData::FBW_SIMBRIDGE_TERRONND_THRESHOLDS,
                                         SIMCONNECT_CLIENT_DATA_PERIOD_ON_SET);

  return SUCCEEDED(result);
}

void SimConnectInterface::processClientData(const SIMCONNECT_RECV_CLIENT_DATA* data) {
  switch (data->dwRequestID) {
    case ClientData::FBW_SIMBRIDGE_TERRONND_THRESHOLDS:
      this->thresholds = *((TerrOnNdThresholds*)&data->dwData);

      std::cout << "Image dimension: " << std::to_string(this->thresholds.imageWidth) << "x" << std::to_string(this->thresholds.imageHeight)
                << std::endl;
      std::cout << "Lower elevation: " << std::to_string(this->thresholds.lowerThreshold)
                << ", mode: " << std::to_string(this->thresholds.lowerThresholdMode) << std::endl;
      std::cout << "Upper elevation: " << std::to_string(this->thresholds.upperThreshold)
                << ", mode: " << std::to_string(this->thresholds.upperThresholdMode) << std::endl;

      return;
    default:
      std::cout << "TERR ON ND: Unknown request ID in SimConnect connection" << std::endl;
      return;
  }
}

void SimConnectInterface::processDispatchMessage(SIMCONNECT_RECV* pData, DWORD* cbData) {
  switch (pData->dwID) {
    case SIMCONNECT_RECV_ID_OPEN:
      std::cout << "TERR ON ND: SimConnect connection established" << std::endl;
      break;
    case SIMCONNECT_RECV_ID_QUIT:
      std::cout << "TERR ON ND: Received SimConnect connection quit message" << std::endl;
      this->disconnect();
      break;
    case SIMCONNECT_RECV_ID_CLIENT_DATA:
      this->processClientData(static_cast<SIMCONNECT_RECV_CLIENT_DATA*>(pData));
      break;
    case SIMCONNECT_RECV_ID_EXCEPTION:
      std::cout << "TERR ON ND: Exception in SimConnect connection";
      break;
    default:
      break;
  }
}

bool SimConnectInterface::readData() {
  if (!this->isConnected) {
    return false;
  }

  DWORD cbData;
  SIMCONNECT_RECV* pData;

  while (SUCCEEDED(SimConnect_GetNextDispatch(this->hSimConnect, &pData, &cbData))) {
    this->processDispatchMessage(pData, &cbData);
  }

  return true;
}