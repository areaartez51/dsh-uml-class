using System;
using System.Collections;
using UnityEngine;

namespace Colonization.Unit
{
    public class UnitMiner : MonoBehaviour, IUnitMiner
    {
        private float _timeMining;
        private Coroutine _coroutine;

        public void Init(float timeMining)
        {
            _timeMining = timeMining;
        }

        public void TryStartMine(ICrystal crystal, IUnitStorage unitStorage, Action executed)
        {
            _coroutine = StartCoroutine(Mining(crystal, unitStorage, executed));
        }

        private IEnumerator Mining(ICrystal crystal, IUnitStorage unitStorage, Action executed)
        {
            yield return new WaitForSeconds(_timeMining);
            executed?.Invoke();
        }
    }
}
