package com.ezone.backend.service;

import com.ezone.backend.dto.dart.DartDisclosureResponse;
import java.util.List;

public interface OpenDartClient {

    List<DartDisclosureResponse> listPeriodicDisclosures(String companyName);

    String downloadDocumentText(String rceptNo);
}
