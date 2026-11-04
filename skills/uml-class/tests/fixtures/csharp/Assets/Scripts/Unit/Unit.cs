using System;
using System.Collections;
using UnityEngine;

namespace Colonization.Unit
{
    public class Unit : MonoBehaviour, IPoolable
    {
        [SerializeField] private Mineral _mineral;
        private Mover _mover;
        private UnitMiner _unitMiner;
        private UnitStorage _unitStorage;
        private UnitTools _unitTools;
        private ITaskDistributor _taskDistributor;
        private int _price;

        public event Action<IPoolable> Destroyer;
        public event Action<IRequest> Listener;

        public int Price => _price;

        public Unit(Mover mover)
        {
            _mover = mover;
        }

        public void Init(UnitConfig unitConfig, ITaskDistributor taskDistributor)
        {
            _taskDistributor = taskDistributor;
            _price = unitConfig.Price;
        }

        public void ReturnToPool()
        {
            Destroyer?.Invoke(this);
        }

        public IEnumerator Collect(CollectionPoint collectionPoint, Resource resource)
        {
            yield return null;
        }
    }
}
